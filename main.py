import discord
from discord.ext import commands
import json
import aiohttp
import asyncio
from datetime import datetime
from web3 import Web3
import uuid
import os


# Function to load configuration
def load_config():
    """Load configuration from config.json file"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ config.json file not found!")
        print("📝 Create a config.json file with your tokens:")
        print(
            '{\n  "discord_token": "YOUR_DISCORD_TOKEN",\n  "privy_app_id": "YOUR_PRIVY_APP_ID",\n  "privy_app_secret": "YOUR_PRIVY_APP_SECRET"\n}')
        exit(1)
    except json.JSONDecodeError:
        print("❌ Error in config.json file - invalid JSON format!")
        exit(1)


# Load configuration
config = load_config()

# Configure intents (bot permissions)
intents = discord.Intents.default()
intents.message_content = True

# Create bot instance with '$' prefix
bot = commands.Bot(command_prefix='$', intents=intents)

# Network configuration with free public RPCs
NETWORKS = {
    'sepolia': {
        'name': 'Sepolia Testnet',
        'chain_id': 11155111,
        'rpc_url': config.get('sepolia_rpc_url', 'https://rpc.sepolia.org'),
        'rpc_alternatives': [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://sepolia.gateway.tenderly.co',
            'https://rpc2.sepolia.org',
            'https://rpc.sepolia.org'
        ],
        'explorer': 'https://sepolia.etherscan.io',
        'currency': 'SepoliaETH',
        'faucet': 'https://sepoliafaucet.com'
    },
    'ethereum': {
        'name': 'Ethereum Mainnet',
        'chain_id': 1,
        'rpc_url': config.get('ethereum_rpc_url', 'https://ethereum-rpc.publicnode.com'),
        'rpc_alternatives': [
            'https://eth.public-rpc.com',
            'https://ethereum.publicnode.com',
            'https://rpc.ankr.com/eth',
            'https://eth-mainnet.public.blastapi.io'
        ],
        'explorer': 'https://etherscan.io',
        'currency': 'ETH',
        'faucet': None
    }
}


class Web3Manager:
    def __init__(self):
        self.connections = {}

    def get_web3(self, network='sepolia'):
        """Get a Web3 connection for a given network with fallback to multiple RPCs"""
        if network not in self.connections:
            # Try primary RPC
            primary_rpc = NETWORKS[network]['rpc_url']
            try:
                w3 = Web3(Web3.HTTPProvider(primary_rpc))
                if w3.is_connected():
                    self.connections[network] = w3
                    return w3
                else:
                    print(f"⚠️ Primary RPC {primary_rpc} unavailable, trying alternatives...")
            except Exception as e:
                print(f"⚠️ Primary RPC error {primary_rpc}: {e}")

            # Try alternative RPCs
            if 'rpc_alternatives' in NETWORKS[network]:
                for rpc_url in NETWORKS[network]['rpc_alternatives']:
                    try:
                        w3 = Web3(Web3.HTTPProvider(rpc_url))
                        if w3.is_connected():
                            print(f"✅ Successfully connected with {rpc_url}")
                            self.connections[network] = w3
                            return w3
                    except Exception as e:
                        print(f"⚠️ Alternative RPC error {rpc_url}: {e}")
                        continue

            print(f"❌ Unable to connect to {network} network")
            return None

        return self.connections[network]

    def is_connected(self, network='sepolia'):
        """Check if Web3 connection is active"""
        w3 = self.get_web3(network)
        if w3:
            try:
                return w3.is_connected()
            except:
                return False
        return False


class PrivyAPI:
    def __init__(self, app_id, app_secret):
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = "https://auth.privy.io"
        self.session = None
        # Configure headers that work
        import base64
        credentials = base64.b64encode(f"{self.app_id}:{self.app_secret}".encode()).decode()
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {credentials}",
            "privy-app-id": self.app_id
        }

    async def get_session(self):
        """Create HTTP session if it doesn't exist"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_user_by_discord_id(self, discord_id):
        """Search for a Privy user by Discord ID"""
        session = await self.get_session()

        try:
            async with session.get(f"{self.base_url}/api/v1/users",
                                   headers=self.headers) as response:
                if response.status == 200:
                    result = await response.json()
                    users = result.get('data', [])

                    # Search for user with matching Discord ID
                    for user in users:
                        linked_accounts = user.get('linked_accounts', [])
                        for account in linked_accounts:
                            if (account.get('type') == 'discord_oauth' and
                                    account.get('subject') == str(discord_id)):
                                return user

                    return None  # No user found
                else:
                    print(f"❌ Error searching user: {response.status}")
                    return None
        except Exception as e:
            print(f"❌ User search error: {e}")
            return None

    async def get_user_wallets(self, user_data):
        """Extract wallets from user data"""
        try:
            wallets = []
            linked_accounts = user_data.get('linked_accounts', [])

            for account in linked_accounts:
                if account.get('type') == 'wallet':
                    wallets.append({
                        'address': account.get('address'),
                        'wallet_type': account.get('wallet_client_type', 'privy'),
                        'chain_type': account.get('chain_type', 'ethereum'),
                        'chain_id': account.get('chain_id', 'eip155:1'),
                        'wallet_client': account.get('wallet_client', 'privy')
                    })

            return {'wallets': wallets} if wallets else None
        except Exception as e:
            print(f"❌ Wallet extraction error: {e}")
            return None

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()


# Initialize Privy API and Web3Manager
privy_api = PrivyAPI(config['privy_app_id'], config['privy_app_secret'])
web3_manager = Web3Manager()


# Event triggered when bot is ready
@bot.event
async def on_ready():
    print(f'✅ Bot connected as {bot.user.name}!')
    print(f'🆔 Bot ID: {bot.user.id}')
    print(f'🌐 Bot is present on {len(bot.guilds)} server(s)')

    # Check Web3 connections
    for network in NETWORKS:
        if web3_manager.is_connected(network):
            print(f'✅ {NETWORKS[network]["name"]} connection active')
        else:
            print(f'❌ {NETWORKS[network]["name"]} connection failed')

    print('------')


# $wallet command
@bot.command(name='wallet')
async def wallet_command(ctx):
    """Retrieve user's wallet information from Privy"""

    # Loading message
    loading_msg = await ctx.send("🔍 Searching for your wallet information...")

    try:
        # Get Discord user
        discord_user_id = ctx.author.id

        # Search user in Privy
        user_data = await privy_api.get_user_by_discord_id(discord_user_id)

        if not user_data:
            await loading_msg.edit(content="❌ No Privy account found linked to your Discord.\n"
                                           "Please connect first on our application with Discord.")
            return

        # Extract wallets from user data
        wallets_data = await privy_api.get_user_wallets(user_data)

        if not wallets_data or not wallets_data.get('wallets'):
            await loading_msg.edit(content="❌ No wallet found for your account.")
            return

        # Format wallet information
        embed = discord.Embed(
            title="💰 Your Wallets",
            description=f"Information for {ctx.author.mention}",
            color=0x00ff00,
            timestamp=datetime.now()
        )

        # User information
        discord_account = None
        for account in user_data.get('linked_accounts', []):
            if account.get('type') == 'discord_oauth':
                discord_account = account
                break

        if discord_account:
            embed.add_field(
                name="🔗 Linked Discord Account",
                value=f"**Username:** {discord_account.get('username', 'N/A')}\n"
                      f"**Email:** {discord_account.get('email', 'N/A')}",
                inline=False
            )

        # Wallet information
        for i, wallet in enumerate(wallets_data['wallets'], 1):
            wallet_address = wallet.get('address', 'Address not available')
            wallet_type = wallet.get('wallet_type', 'Unknown type')
            chain_type = wallet.get('chain_type', 'Unknown chain')
            chain_id = wallet.get('chain_id', 'N/A')

            # Format chain name
            chain_name = "Ethereum" if "eip155" in chain_id else "Solana" if "solana" in chain_id else chain_type

            embed.add_field(
                name=f"💼 Wallet {i} ({chain_name})",
                value=f"**Address:** `{wallet_address}`\n"
                      f"**Type:** {wallet_type}\n"
                      f"**Chain:** {chain_name}",
                inline=False
            )

        embed.add_field(
            name="🆔 Privy User ID",
            value=f"`{user_data.get('id', 'N/A')}`",
            inline=False
        )

        embed.add_field(
            name="🌐 Supported Networks",
            value="• Ethereum Mainnet\n• Sepolia Testnet\n\nUse `$balance sepolia` to see your Sepolia balance",
            inline=False
        )

        embed.set_footer(text="Information retrieved from Privy.io")

        await loading_msg.edit(content="", embed=embed)

    except Exception as e:
        await loading_msg.edit(content=f"❌ Error retrieving information: {str(e)}")
        print(f"❌ Error in wallet_command: {e}")


# New $balance command to check balance on Sepolia
@bot.command(name='balance')
async def balance_command(ctx, network='sepolia'):
    """Check your wallet balance on a specific network"""

    if network not in NETWORKS:
        await ctx.send(f"❌ Network '{network}' not supported.\n"
                       f"Available networks: {', '.join(NETWORKS.keys())}")
        return

    loading_msg = await ctx.send(f"🔍 Checking balance on {NETWORKS[network]['name']}...")

    try:
        # Get user and their wallets
        discord_user_id = ctx.author.id
        user_data = await privy_api.get_user_by_discord_id(discord_user_id)

        if not user_data:
            await loading_msg.edit(content="❌ No Privy account found linked to your Discord.")
            return

        wallets_data = await privy_api.get_user_wallets(user_data)

        if not wallets_data or not wallets_data.get('wallets'):
            await loading_msg.edit(content="❌ No wallet found for your account.")
            return

        # Get Web3 connection
        w3 = web3_manager.get_web3(network)

        if not w3 or not web3_manager.is_connected(network):
            await loading_msg.edit(content=f"❌ Unable to connect to {NETWORKS[network]['name']} network.")
            return

        embed = discord.Embed(
            title=f"💰 Balances on {NETWORKS[network]['name']}",
            description=f"Information for {ctx.author.mention}",
            color=0x3498db,
            timestamp=datetime.now()
        )

        # Check balance for each Ethereum wallet
        for i, wallet in enumerate(wallets_data['wallets'], 1):
            wallet_address = wallet.get('address')
            chain_type = wallet.get('chain_type', '')

            # Check if it's an Ethereum wallet
            if 'ethereum' in chain_type.lower() or 'eip155' in wallet.get('chain_id', ''):
                try:
                    # Verify address is valid
                    if w3.is_address(wallet_address):
                        checksum_address = w3.to_checksum_address(wallet_address)
                        balance_wei = w3.eth.get_balance(checksum_address)
                        balance_eth = w3.from_wei(balance_wei, 'ether')

                        embed.add_field(
                            name=f"💼 Wallet {i}",
                            value=f"**Address:** `{wallet_address}`\n"
                                  f"**Balance:** {balance_eth:.6f} {NETWORKS[network]['currency']}\n"
                                  f"**Explorer:** [View on Etherscan]({NETWORKS[network]['explorer']}/address/{wallet_address})",
                            inline=False
                        )
                    else:
                        embed.add_field(
                            name=f"💼 Wallet {i}",
                            value=f"**Address:** `{wallet_address}`\n"
                                  f"**Error:** Invalid address",
                            inline=False
                        )
                except Exception as e:
                    embed.add_field(
                        name=f"💼 Wallet {i}",
                        value=f"**Address:** `{wallet_address}`\n"
                              f"**Error:** {str(e)[:100]}...",
                        inline=False
                    )

        # Network information
        try:
            block_number = w3.eth.block_number
            gas_price = w3.eth.gas_price
            gas_price_gwei = w3.from_wei(gas_price, 'gwei')

            embed.add_field(
                name="🌐 Network Information",
                value=f"**Network:** {NETWORKS[network]['name']}\n"
                      f"**Current Block:** {block_number:,}\n"
                      f"**Gas Price:** {gas_price_gwei:.2f} Gwei",
                inline=False
            )
        except Exception as e:
            print(f"❌ Error retrieving network info: {e}")

        # Add faucet link for Sepolia
        if network == 'sepolia':
            embed.add_field(
                name="🚰 Need test funds?",
                value=f"Get free SepoliaETH: [Sepolia Faucet]({NETWORKS['sepolia']['faucet']})",
                inline=False
            )

        embed.set_footer(text=f"Data retrieved from {NETWORKS[network]['name']}")

        await loading_msg.edit(content="", embed=embed)

    except Exception as e:
        await loading_msg.edit(content=f"❌ Error checking balance: {str(e)}")
        print(f"❌ Error in balance_command: {e}")


# $networks command to list supported networks
@bot.command(name='networks')
async def networks_command(ctx):
    """Display supported networks"""

    embed = discord.Embed(
        title="🌐 Supported Networks",
        description="List of available blockchain networks",
        color=0x9b59b6,
        timestamp=datetime.now()
    )

    for network_key, network_info in NETWORKS.items():
        status = "🟢 Connected" if web3_manager.is_connected(network_key) else "🔴 Disconnected"
        faucet_info = f"\n**Faucet:** [Link]({network_info['faucet']})" if network_info['faucet'] else ""

        embed.add_field(
            name=f"{network_info['name']} ({network_key})",
            value=f"**Chain ID:** {network_info['chain_id']}\n"
                  f"**Currency:** {network_info['currency']}\n"
                  f"**Status:** {status}\n"
                  f"**Explorer:** [Etherscan]({network_info['explorer']})"
                  f"{faucet_info}",
            inline=False
        )

    embed.add_field(
        name="💡 Usage",
        value="• `$balance sepolia` - Check Sepolia balance\n"
              "• `$balance ethereum` - Check Ethereum balance\n"
              "• `$wallet` - View all your wallets",
        inline=False
    )

    embed.set_footer(text="Use $balance <network> to check your balances")

    await ctx.send(embed=embed)


# Command error handling
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        return
    else:
        print(f'❌ Command error: {error}')
        await ctx.send('An error occurred while executing the command.')


# Optional event: react to messages (without command)
@bot.event
async def on_message(message):
    if message.author == bot.user:
        return
    await bot.process_commands(message)


# Cleanup function on shutdown
async def close_bot():
    await privy_api.close()
    await bot.close()


# Temporary storage for pending payments
pending_payments = {}


def save_pending_payments():
    """Save pending payments to a file"""
    try:
        with open('pending_payments.json', 'w') as f:
            json.dump(pending_payments, f, indent=2, default=str)
    except Exception as e:
        print(f"❌ Error saving payments: {e}")


def load_pending_payments():
    """Load pending payments from file"""
    global pending_payments
    try:
        if os.path.exists('pending_payments.json'):
            with open('pending_payments.json', 'r') as f:
                pending_payments = json.load(f)
    except Exception as e:
        print(f"❌ Error loading payments: {e}")
        pending_payments = {}


# $pay command
@bot.command(name='pay')
async def pay_command(ctx, recipient: discord.Member = None, amount: float = None, *, currency: str = "ETH"):
    """Allows paying another Discord user"""

    # Parameter validation
    if recipient is None:
        # This message will be ephemeral
        await ctx.send("❌ **Usage:** `$pay @user <amount> [currency]`\n"
                       "📋 **Example:** `$pay @JohnDoe 0.1 ETH`",
                       ephemeral=True)
        return

    if amount is None or amount <= 0:
        # This message will be ephemeral
        await ctx.send("❌ Please specify a valid amount (greater than 0)", ephemeral=True)
        return

    if recipient == ctx.author:
        # This message will be ephemeral
        await ctx.send("❌ You cannot pay yourself!", ephemeral=True)
        return

    if recipient.bot:
        # This message will be ephemeral
        await ctx.send("❌ You cannot pay a bot!", ephemeral=True)
        return

    # Delete the user's initial message to not show it publicly
    try:
        await ctx.message.delete()
    except discord.Forbidden:
        print(f"Unable to delete message from {ctx.author}. Missing permissions?")
        # Continue even without deletion if permissions are missing
    except discord.NotFound:
        pass  # Message already deleted or not found

    # Send initial loading message as a DM to the sender
    loading_msg_dm = await ctx.author.send("🔄 Processing your payment request...")

    try:
        # Verify sender has a Privy account
        sender_data = await privy_api.get_user_by_discord_id(ctx.author.id)
        if not sender_data:
            await loading_msg_dm.edit(
                content="❌ **Sender error:** No Privy account found linked to your Discord.\n"
                        "Please connect first on our application with Discord.")
            return

        # Verify recipient has a Privy account
        recipient_data = await privy_api.get_user_by_discord_id(recipient.id)
        if not recipient_data:
            await loading_msg_dm.edit(
                content=f"❌ **Recipient error:** {recipient.mention} doesn't have a linked Privy account.\n"
                        "The recipient must first connect on our application.")
            return

        # Get sender's wallets
        sender_wallets = await privy_api.get_user_wallets(sender_data)
        if not sender_wallets or not sender_wallets.get('wallets'):
            await loading_msg_dm.edit(content="❌ **Sender error:** No wallet found for your account.")
            return

        # Get recipient's wallets
        recipient_wallets = await privy_api.get_user_wallets(recipient_data)
        if not recipient_wallets or not recipient_wallets.get('wallets'):
            await loading_msg_dm.edit(
                content=f"❌ **Recipient error:** {recipient.mention} doesn't have a configured wallet.")
            return

        # Take the first wallet of each user (Sepolia by default)
        sender_wallet = None
        recipient_wallet = None

        # Look for Sepolia wallet first, then Ethereum
        for wallet in sender_wallets['wallets']:
            if ('eip155:11155111' in wallet.get('chain_id', '') or
                    'eip155' in wallet.get('chain_id', '') or
                    wallet.get('chain_type') == 'ethereum'):
                sender_wallet = wallet
                break

        for wallet in recipient_wallets['wallets']:
            if ('eip155:11155111' in wallet.get('chain_id', '') or
                    'eip155' in wallet.get('chain_id', '') or
                    wallet.get('chain_type') == 'ethereum'):
                recipient_wallet = wallet
                break

        # If no Ethereum wallet, take the first available
        if not sender_wallet and sender_wallets['wallets']:
            sender_wallet = sender_wallets['wallets'][0]

        if not recipient_wallet and recipient_wallets['wallets']:
            recipient_wallet = recipient_wallets['wallets'][0]

        if not sender_wallet or not recipient_wallet:
            await loading_msg_dm.edit(content="❌ Unable to find compatible wallets for the transaction.")
            return

        # Technical details - calculate chains before using them
        def get_chain_name(wallet):
            chain_id = wallet.get('chain_id', '')
            if 'eip155:11155111' in chain_id:
                return 'Sepolia Testnet'
            elif 'eip155:1' in chain_id:
                return 'Ethereum Mainnet'
            elif 'eip155' in chain_id:
                return f"Ethereum (Chain {chain_id.split(':')[-1]})"
            else:
                return wallet.get('chain_type', 'Unknown')

        sender_chain = get_chain_name(sender_wallet)
        recipient_chain = get_chain_name(recipient_wallet)

        # Generate unique ID for payment
        payment_id = str(uuid.uuid4())

        # Store payment information
        payment_data = {
            'id': payment_id,
            'sender_id': ctx.author.id,
            'sender_name': str(ctx.author),
            'recipient_id': recipient.id,
            'recipient_name': str(recipient),
            'amount': amount,
            'currency': currency.upper(),
            'sender_wallet': sender_wallet['address'],
            'recipient_wallet': recipient_wallet['address'],
            'sender_chain': sender_chain,
            'recipient_chain': recipient_chain,
            'timestamp': datetime.now().isoformat(),
            'status': 'pending',  # Initial status
            'guild_id': ctx.guild.id,
            'channel_id': ctx.channel.id,
            'transaction_hash': None  # Add field for transaction hash
        }

        pending_payments[payment_id] = payment_data
        save_pending_payments()

        # Payment confirmation URL (adapt URL according to your configuration)
        confirmation_url = f"http://localhost:5173/confirm-payment/{payment_id}"

        # Create the payment embed for the SENDER (DM)
        embed = discord.Embed(
            title="💸 Your payment is ready to be sent!",  # More engaging title
            description=f"Hi {ctx.author.mention}, your payment request of **{amount} {currency.upper()}** to {recipient.mention} has been generated.",
            color=0x3498db,  # A nice blue color
            timestamp=datetime.now()
        )

        embed.add_field(
            name="➡️ Transaction Details",
            value=(
                f"**From:** {ctx.author.name} (`{sender_wallet['address'][:6]}...{sender_wallet['address'][-4:]}`)\n"
                f"**To:** {recipient.name} (`{recipient_wallet['address'][:6]}...{recipient_wallet['address'][-4:]}`)\n"
                f"**Amount:** `{amount} {currency.upper()}`"
            ),
            inline=False
        )

        embed.add_field(
            name="🔗 Confirm and Send",
            value=f"To finalize this payment, please click on the secure link below and follow the instructions:\n[**Confirm payment here**]({confirmation_url})",
            inline=False
        )

        # Add note for Sepolia
        testnet_warning = ""
        if "Sepolia" in sender_chain or "Sepolia" in recipient_chain:
            testnet_warning = "\n🚨 **Warning: This is the Sepolia test network.** Funds have no real value."

        embed.add_field(
            name="⚠️ Important Information",
            value=(
                f"This link is personal and must be used by you only.\n"
                f"The link will expire after 24 hours.\n"
                f"**Transaction ID:** `{payment_id}`"
                f"{testnet_warning}"
            ),
            inline=False
        )

        embed.set_footer(text="Thank you for using PayBot for your secure transactions.")

        # Send embed as DM to sender
        await loading_msg_dm.edit(content="", embed=embed)
        # Send a short, ephemeral message in the channel
        await ctx.send(
            f"✅ {ctx.author.mention}, your payment request has been sent to your private messages. Please check your DMs to confirm the transaction.",
            ephemeral=True)

    except Exception as e:
        await loading_msg_dm.edit(content=f"❌ Error processing payment: {str(e)}")
        print(f"❌ Error in pay_command: {e}")


# New command to check payment status
@bot.command(name='payment')
async def payment_status(ctx, payment_id: str = None):
    """Check payment status"""
    if not payment_id:
        await ctx.send("❌ **Usage:** `$payment <payment_ID>`", ephemeral=True)
        return

    payment = pending_payments.get(payment_id)
    if not payment:
        await ctx.send("❌ Payment not found or expired.", ephemeral=True)
        return

    # Check if the user requesting status is sender or recipient
    if ctx.author.id not in [payment['sender_id'], payment['recipient_id']]:
        await ctx.send("❌ You are not authorized to view this payment status.", ephemeral=True)
        return

    embed = discord.Embed(
        title=f"📊 Payment Status",
        color=0x00ff00 if payment['status'] == 'completed' else 0xffaa00,
        timestamp=datetime.now()
    )

    embed.add_field(name="🆔 ID", value=f"`{payment_id}`", inline=True)
    embed.add_field(name="📊 Status", value=payment['status'], inline=True)
    embed.add_field(name="💰 Amount", value=f"{payment['amount']} {payment['currency']}", inline=True)
    embed.add_field(name="👤 Sender", value=payment['sender_name'], inline=True)
    embed.add_field(name="👤 Recipient", value=payment['recipient_name'], inline=True)
    embed.add_field(name="📅 Date", value=payment['timestamp'][:19], inline=True)
    if payment.get('transaction_hash'):
        embed.add_field(name="🔗 Transaction Hash", value=f"`{payment['transaction_hash']}`", inline=False)

    await ctx.send(embed=embed, ephemeral=True)  # Made this response ephemeral too


# NEW COMMAND: To be called by your backend after transaction confirmation
@bot.command(name='confirm_payment')
@commands.is_owner()  # Limit this command to bot owner for security
async def confirm_payment_command(ctx, payment_id: str = None, transaction_hash: str = "N/A"):
    """
    [ADMIN ONLY] Simulates payment confirmation by backend.
    Sends private message to recipient once transaction is "processed".
    """
    if not payment_id:
        await ctx.send("❌ Usage: `$confirm_payment <payment_ID> [transaction_hash]`")
        return

    payment = pending_payments.get(payment_id)
    if not payment:
        await ctx.send(f"❌ Payment with ID `{payment_id}` not found or already processed.")
        return

    if payment['status'] == 'completed':
        await ctx.send(f"⚠️ Payment `{payment_id}` is already marked as completed.")
        return

    # Update payment status
    payment['status'] = 'completed'
    payment['transaction_hash'] = transaction_hash
    save_pending_payments()

    # Get Discord recipient
    recipient_id = payment['recipient_id']
    recipient_discord_user = bot.get_user(recipient_id)  # Try to get user object

    if not recipient_discord_user:
        try:  # If not in cache, try to fetch
            recipient_discord_user = await bot.fetch_user(recipient_id)
        except discord.NotFound:
            print(f"❌ Discord recipient {recipient_id} not found for payment {payment_id}")
            await ctx.send(f"❌ Discord recipient for payment `{payment_id}` not found.")
            return
        except Exception as e:
            print(f"❌ Error fetching recipient {recipient_id}: {e}")
            await ctx.send(f"❌ Error retrieving recipient for payment `{payment_id}`.")
            return

    # Send DM to recipient
    try:
        embed = discord.Embed(
            title="🎉 You received money!",  # New title
            description=(f"{payment['sender_name']} sent you **{payment['amount']} {payment['currency']}** "
                         f"to your wallet `{payment['recipient_wallet'][:10]}...{payment['recipient_wallet'][-8:]}` !"),
            # New description
            color=0x00ff00,
            timestamp=datetime.now()
        )

        embed.add_field(
            name="🆔 Payment ID",
            value=f"`{payment_id}`",
            inline=True
        )
        if transaction_hash != "N/A":
            embed.add_field(
                name="🔗 Transaction Hash",
                value=f"`{transaction_hash}`",
                inline=False
            )
            network_info = None
            # Try to find explorer information for recipient's network
            for key, info in NETWORKS.items():
                if info['name'] == payment['recipient_chain']:
                    network_info = info
                    break

            if network_info and network_info.get('explorer'):
                embed.add_field(
                    name="🌐 View on Explorer",
                    value=f"[Click here]({network_info['explorer']}/tx/{transaction_hash})",
                    inline=False
                )

        embed.set_footer(text="Congratulations!")

        await recipient_discord_user.send(embed=embed)
        await ctx.send(
            f"✅ Payment `{payment_id}` marked as completed. DM sent to {recipient_discord_user.mention}.")

    except discord.Forbidden:
        await ctx.send(
            f"❌ Unable to send DM to {recipient_discord_user.mention}. They may have DMs disabled.")
    except Exception as e:
        await ctx.send(f"❌ Error sending DM to recipient for payment `{payment_id}`: {str(e)}")
        print(f"❌ Error sending payment confirmation DM: {e}")


# New command to get Sepolia test ETH
@bot.command(name='faucet')
async def faucet_command(ctx):
    """Provides links to Sepolia faucets"""

    embed = discord.Embed(
        title="🚰 Sepolia Testnet Faucets",
        description="Get test ETH for Sepolia",
        color=0x00ff00,
        timestamp=datetime.now()
    )

    embed.add_field(
        name="🔗 Recommended Faucets",
        value="• [Sepolia Faucet](https://sepoliafaucet.com/)\n"
              "• [Alchemy Sepolia Faucet](https://sepoliafaucet.net/)\n"
              "• [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia)\n"
              "• [Infura Faucet](https://www.infura.io/faucet/sepolia)",
        inline=False
    )

    embed.add_field(
        name="📋 Instructions",
        value="1. Use `$wallet` to get your address\n"
              "2. Visit one of the faucets above\n"
              "3. Paste your wallet address\n"
              "4. Get your free test ETH",
        inline=False
    )

    embed.add_field(
        name="⚠️ Important",
        value="• Sepolia ETH has no real value\n"
              "• Used only for testing\n"
              "• Daily limit per faucet",
        inline=False
    )

    await ctx.send(embed=embed)


# Load pending payments at startup
load_pending_payments()

# Launch the bot
if __name__ == '__main__':
    try:
        print("🚀 Starting bot...")
        bot.run(config['discord_token'])
    except discord.errors.LoginFailure:
        print("❌ Invalid Discord token! Check your token in config.json")
    except KeyError as e:
        print(f"❌ Missing key in config.json: {e}")
        print("📝 Make sure you have: discord_token, privy_app_id, privy_app_secret")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        # Cleanup
        asyncio.run(privy_api.close())