import discord
from discord.ext import commands
import json
import aiohttp
import asyncio
from datetime import datetime
from web3 import Web3
from web3.exceptions import Web3Exception
import uuid
import os


# Fonction pour charger la configuration
def load_config():
    """Charge la configuration depuis le fichier config.json"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Fichier config.json non trouvé!")
        print("📝 Créez un fichier config.json avec vos tokens:")
        print(
            '{\n  "discord_token": "VOTRE_TOKEN_DISCORD",\n  "privy_app_id": "VOTRE_PRIVY_APP_ID",\n  "privy_app_secret": "VOTRE_PRIVY_APP_SECRET"\n}')
        exit(1)
    except json.JSONDecodeError:
        print("❌ Erreur dans le fichier config.json - format JSON invalide!")
        exit(1)


# Charger la configuration
config = load_config()

# Configuration des intents (permissions du bot)
intents = discord.Intents.default()
intents.message_content = True

# Créer une instance du bot avec le préfixe '$'
bot = commands.Bot(command_prefix='$', intents=intents)

# Configuration des réseaux avec RPC publics gratuits
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
        """Obtient une connexion Web3 pour un réseau donné avec fallback sur plusieurs RPC"""
        if network not in self.connections:
            # Essayer le RPC principal
            primary_rpc = NETWORKS[network]['rpc_url']
            try:
                w3 = Web3(Web3.HTTPProvider(primary_rpc))
                if w3.is_connected():
                    self.connections[network] = w3
                    return w3
                else:
                    print(f"⚠️ RPC principal {primary_rpc} non disponible, essai des alternatives...")
            except Exception as e:
                print(f"⚠️ Erreur RPC principal {primary_rpc}: {e}")

            # Essayer les RPC alternatifs
            if 'rpc_alternatives' in NETWORKS[network]:
                for rpc_url in NETWORKS[network]['rpc_alternatives']:
                    try:
                        w3 = Web3(Web3.HTTPProvider(rpc_url))
                        if w3.is_connected():
                            print(f"✅ Connexion réussie avec {rpc_url}")
                            self.connections[network] = w3
                            return w3
                    except Exception as e:
                        print(f"⚠️ Erreur RPC alternatif {rpc_url}: {e}")
                        continue

            print(f"❌ Impossible de se connecter au réseau {network}")
            return None

        return self.connections[network]

    def is_connected(self, network='sepolia'):
        """Vérifie si la connexion Web3 est active"""
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
        # Configurer les headers qui fonctionnent
        import base64
        credentials = base64.b64encode(f"{self.app_id}:{self.app_secret}".encode()).decode()
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {credentials}",
            "privy-app-id": self.app_id
        }

    async def get_session(self):
        """Crée une session HTTP si elle n'existe pas"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_user_by_discord_id(self, discord_id):
        """Recherche un utilisateur Privy par son ID Discord"""
        session = await self.get_session()

        try:
            async with session.get(f"{self.base_url}/api/v1/users",
                                   headers=self.headers) as response:
                if response.status == 200:
                    result = await response.json()
                    users = result.get('data', [])

                    # Chercher un utilisateur avec le Discord ID correspondant
                    for user in users:
                        linked_accounts = user.get('linked_accounts', [])
                        for account in linked_accounts:
                            if (account.get('type') == 'discord_oauth' and
                                    account.get('subject') == str(discord_id)):
                                return user

                    return None  # Aucun utilisateur trouvé
                else:
                    print(f"❌ Erreur lors de la recherche utilisateur: {response.status}")
                    return None
        except Exception as e:
            print(f"❌ Erreur recherche utilisateur: {e}")
            return None

    async def get_user_wallets(self, user_data):
        """Extrait les wallets depuis les données utilisateur"""
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
            print(f"❌ Erreur extraction wallets: {e}")
            return None

    async def close(self):
        """Ferme la session HTTP"""
        if self.session:
            await self.session.close()


# Initialiser l'API Privy et Web3Manager
privy_api = PrivyAPI(config['privy_app_id'], config['privy_app_secret'])
web3_manager = Web3Manager()


# Événement déclenché quand le bot est prêt
@bot.event
async def on_ready():
    print(f'✅ Bot connecté en tant que {bot.user.name}!')
    print(f'🆔 ID du bot: {bot.user.id}')
    print(f'🌐 Le bot est présent sur {len(bot.guilds)} serveur(s)')

    # Vérifier les connexions Web3
    for network in NETWORKS:
        if web3_manager.is_connected(network):
            print(f'✅ Connexion {NETWORKS[network]["name"]} active')
        else:
            print(f'❌ Connexion {NETWORKS[network]["name"]} échouée')

    print('------')


# Commande $hello
@bot.command(name='hello')
async def hello_command(ctx):
    """Commande qui salue l'utilisateur"""
    await ctx.reply(f'Salut {ctx.author.mention} ! 👋 Comment ça va ?')


# Commande $wallet
@bot.command(name='wallet')
async def wallet_command(ctx):
    """Récupère les informations de wallet de l'utilisateur depuis Privy"""

    # Message de chargement
    loading_msg = await ctx.send("🔍 Recherche de vos informations de wallet...")

    try:
        # Récupérer l'utilisateur Discord
        discord_user_id = ctx.author.id

        # Rechercher l'utilisateur dans Privy
        user_data = await privy_api.get_user_by_discord_id(discord_user_id)

        if not user_data:
            await loading_msg.edit(content="❌ Aucun compte Privy trouvé lié à votre Discord.\n"
                                           "Connectez-vous d'abord sur notre application avec Discord.")
            return

        # Extraire les wallets depuis les données utilisateur
        wallets_data = await privy_api.get_user_wallets(user_data)

        if not wallets_data or not wallets_data.get('wallets'):
            await loading_msg.edit(content="❌ Aucun wallet trouvé pour votre compte.")
            return

        # Formater les informations des wallets
        embed = discord.Embed(
            title="💰 Vos Wallets",
            description=f"Informations pour {ctx.author.mention}",
            color=0x00ff00,
            timestamp=datetime.now()
        )

        # Informations utilisateur
        discord_account = None
        for account in user_data.get('linked_accounts', []):
            if account.get('type') == 'discord_oauth':
                discord_account = account
                break

        if discord_account:
            embed.add_field(
                name="🔗 Compte Discord lié",
                value=f"**Username:** {discord_account.get('username', 'N/A')}\n"
                      f"**Email:** {discord_account.get('email', 'N/A')}",
                inline=False
            )

        # Informations des wallets
        for i, wallet in enumerate(wallets_data['wallets'], 1):
            wallet_address = wallet.get('address', 'Adresse non disponible')
            wallet_type = wallet.get('wallet_type', 'Type inconnu')
            chain_type = wallet.get('chain_type', 'Chaîne inconnue')
            chain_id = wallet.get('chain_id', 'N/A')

            # Formater le nom de la chaîne
            chain_name = "Ethereum" if "eip155" in chain_id else "Solana" if "solana" in chain_id else chain_type

            embed.add_field(
                name=f"💼 Wallet {i} ({chain_name})",
                value=f"**Adresse:** `{wallet_address}`\n"
                      f"**Type:** {wallet_type}\n"
                      f"**Chaîne:** {chain_name}",
                inline=False
            )

        embed.add_field(
            name="🆔 Privy User ID",
            value=f"`{user_data.get('id', 'N/A')}`",
            inline=False
        )

        embed.add_field(
            name="🌐 Réseaux supportés",
            value="• Ethereum Mainnet\n• Sepolia Testnet\n\nUtilisez `$balance sepolia` pour voir votre solde Sépolia",
            inline=False
        )

        embed.set_footer(text="Informations récupérées depuis Privy.io")

        await loading_msg.edit(content="", embed=embed)

    except Exception as e:
        await loading_msg.edit(content=f"❌ Erreur lors de la récupération des informations: {str(e)}")
        print(f"❌ Erreur dans wallet_command: {e}")


# Nouvelle commande $balance pour vérifier le solde sur Sépolia
@bot.command(name='balance')
async def balance_command(ctx, network='sepolia'):
    """Vérifie le solde de votre wallet sur un réseau spécifique"""

    if network not in NETWORKS:
        await ctx.send(f"❌ Réseau '{network}' non supporté.\n"
                       f"Réseaux disponibles: {', '.join(NETWORKS.keys())}")
        return

    loading_msg = await ctx.send(f"🔍 Vérification du solde sur {NETWORKS[network]['name']}...")

    try:
        # Récupérer l'utilisateur et ses wallets
        discord_user_id = ctx.author.id
        user_data = await privy_api.get_user_by_discord_id(discord_user_id)

        if not user_data:
            await loading_msg.edit(content="❌ Aucun compte Privy trouvé lié à votre Discord.")
            return

        wallets_data = await privy_api.get_user_wallets(user_data)

        if not wallets_data or not wallets_data.get('wallets'):
            await loading_msg.edit(content="❌ Aucun wallet trouvé pour votre compte.")
            return

        # Obtenir la connexion Web3
        w3 = web3_manager.get_web3(network)

        if not w3 or not web3_manager.is_connected(network):
            await loading_msg.edit(content=f"❌ Impossible de se connecter au réseau {NETWORKS[network]['name']}.")
            return

        embed = discord.Embed(
            title=f"💰 Soldes sur {NETWORKS[network]['name']}",
            description=f"Informations pour {ctx.author.mention}",
            color=0x3498db,
            timestamp=datetime.now()
        )

        # Vérifier le solde pour chaque wallet Ethereum
        for i, wallet in enumerate(wallets_data['wallets'], 1):
            wallet_address = wallet.get('address')
            chain_type = wallet.get('chain_type', '')

            # Vérifier si c'est un wallet Ethereum
            if 'ethereum' in chain_type.lower() or 'eip155' in wallet.get('chain_id', ''):
                try:
                    # Vérifier que l'adresse est valide
                    if w3.is_address(wallet_address):
                        checksum_address = w3.to_checksum_address(wallet_address)
                        balance_wei = w3.eth.get_balance(checksum_address)
                        balance_eth = w3.from_wei(balance_wei, 'ether')

                        embed.add_field(
                            name=f"💼 Wallet {i}",
                            value=f"**Adresse:** `{wallet_address}`\n"
                                  f"**Solde:** {balance_eth:.6f} {NETWORKS[network]['currency']}\n"
                                  f"**Explorer:** [Voir sur Etherscan]({NETWORKS[network]['explorer']}/address/{wallet_address})",
                            inline=False
                        )
                    else:
                        embed.add_field(
                            name=f"💼 Wallet {i}",
                            value=f"**Adresse:** `{wallet_address}`\n"
                                  f"**Erreur:** Adresse invalide",
                            inline=False
                        )
                except Exception as e:
                    embed.add_field(
                        name=f"💼 Wallet {i}",
                        value=f"**Adresse:** `{wallet_address}`\n"
                              f"**Erreur:** {str(e)[:100]}...",
                        inline=False
                    )

        # Informations sur le réseau
        try:
            block_number = w3.eth.block_number
            gas_price = w3.eth.gas_price
            gas_price_gwei = w3.from_wei(gas_price, 'gwei')

            embed.add_field(
                name="🌐 Informations du réseau",
                value=f"**Réseau:** {NETWORKS[network]['name']}\n"
                      f"**Bloc actuel:** {block_number:,}\n"
                      f"**Prix du gaz:** {gas_price_gwei:.2f} Gwei",
                inline=False
            )
        except Exception as e:
            print(f"❌ Erreur récupération infos réseau: {e}")

        # Ajouter le lien vers le faucet pour Sépolia
        if network == 'sepolia':
            embed.add_field(
                name="🚰 Besoin de fonds de test ?",
                value=f"Obtenez des SepoliaETH gratuits : [Sépolia Faucet]({NETWORKS['sepolia']['faucet']})",
                inline=False
            )

        embed.set_footer(text=f"Données récupérées depuis {NETWORKS[network]['name']}")

        await loading_msg.edit(content="", embed=embed)

    except Exception as e:
        await loading_msg.edit(content=f"❌ Erreur lors de la vérification du solde: {str(e)}")
        print(f"❌ Erreur dans balance_command: {e}")


# Commande $networks pour lister les réseaux supportés
@bot.command(name='networks')
async def networks_command(ctx):
    """Affiche les réseaux supportés"""

    embed = discord.Embed(
        title="🌐 Réseaux supportés",
        description="Liste des réseaux blockchain disponibles",
        color=0x9b59b6,
        timestamp=datetime.now()
    )

    for network_key, network_info in NETWORKS.items():
        status = "🟢 Connecté" if web3_manager.is_connected(network_key) else "🔴 Déconnecté"
        faucet_info = f"\n**Faucet:** [Lien]({network_info['faucet']})" if network_info['faucet'] else ""

        embed.add_field(
            name=f"{network_info['name']} ({network_key})",
            value=f"**Chain ID:** {network_info['chain_id']}\n"
                  f"**Devise:** {network_info['currency']}\n"
                  f"**Status:** {status}\n"
                  f"**Explorer:** [Etherscan]({network_info['explorer']})"
                  f"{faucet_info}",
            inline=False
        )

    embed.add_field(
        name="💡 Utilisation",
        value="• `$balance sepolia` - Vérifier solde Sépolia\n"
              "• `$balance ethereum` - Vérifier solde Ethereum\n"
              "• `$wallet` - Voir tous vos wallets",
        inline=False
    )

    embed.set_footer(text="Utilisez $balance <réseau> pour vérifier vos soldes")

    await ctx.send(embed=embed)


# Commande $test simplifiée
@bot.command(name='test')
async def test_command(ctx):
    """Teste la connexion à l'API Privy et aux réseaux"""
    loading_msg = await ctx.send("🔍 Test des connexions...")

    try:
        # Test de l'API Privy
        session = await privy_api.get_session()
        async with session.get(f"{privy_api.base_url}/api/v1/users",
                               headers=privy_api.headers) as response:
            if response.status == 200:
                result = await response.json()
                total_users = len(result.get('data', []))

                # Compter les utilisateurs avec Discord
                discord_users = 0
                for user in result.get('data', []):
                    for account in user.get('linked_accounts', []):
                        if account.get('type') == 'discord_oauth':
                            discord_users += 1
                            break

                embed = discord.Embed(
                    title="🔧 Test des connexions",
                    color=0x00ff00,
                    timestamp=datetime.now()
                )

                embed.add_field(
                    name="✅ API Privy",
                    value=f"**Total utilisateurs:** {total_users}\n"
                          f"**Avec Discord:** {discord_users}\n"
                          f"**Méthode:** Basic Auth",
                    inline=False
                )

                # Test des connexions Web3
                network_status = ""
                for network_key, network_info in NETWORKS.items():
                    if web3_manager.is_connected(network_key):
                        w3 = web3_manager.get_web3(network_key)
                        try:
                            block_number = w3.eth.block_number
                            network_status += f"✅ {network_info['name']}: Bloc {block_number:,}\n"
                        except:
                            network_status += f"⚠️ {network_info['name']}: Connecté mais erreur\n"
                    else:
                        network_status += f"❌ {network_info['name']}: Déconnecté\n"

                embed.add_field(
                    name="🌐 Réseaux Web3",
                    value=network_status,
                    inline=False
                )

                await loading_msg.edit(content="", embed=embed)
            else:
                await loading_msg.edit(content=f"❌ Erreur API Privy: {response.status}")
    except Exception as e:
        await loading_msg.edit(content=f"❌ Erreur lors du test: {str(e)}")


# Gestion des erreurs de commandes
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        return
    else:
        print(f'❌ Erreur dans la commande: {error}')
        await ctx.send('Une erreur s\'est produite lors de l\'exécution de la commande.')


# Événement optionnel : réagir aux messages (sans commande)
@bot.event
async def on_message(message):
    if message.author == bot.user:
        return
    await bot.process_commands(message)


# Fonction de nettoyage à la fermeture
async def close_bot():
    await privy_api.close()
    await bot.close()


# Stockage temporaire des paiements en attente
pending_payments = {}

def save_pending_payments():
    """Sauvegarde les paiements en attente dans un fichier"""
    try:
        with open('pending_payments.json', 'w') as f:
            json.dump(pending_payments, f, indent=2, default=str)
    except Exception as e:
        print(f"❌ Erreur sauvegarde paiements: {e}")

def load_pending_payments():
    """Charge les paiements en attente depuis le fichier"""
    global pending_payments
    try:
        if os.path.exists('pending_payments.json'):
            with open('pending_payments.json', 'r') as f:
                pending_payments = json.load(f)
    except Exception as e:
        print(f"❌ Erreur chargement paiements: {e}")
        pending_payments = {}


# Commande $pay
@bot.command(name='pay')
async def pay_command(ctx, recipient: discord.Member = None, amount: float = None, *, currency: str = "ETH"):
    """Permet de payer un autre utilisateur Discord"""
    
    # Validation des paramètres
    if recipient is None:
        await ctx.send("❌ **Usage:** `$pay @utilisateur <montant> [devise]`\n"
                      "📋 **Exemple:** `$pay @JohnDoe 0.1 ETH`")
        return
    
    if amount is None or amount <= 0:
        await ctx.send("❌ Veuillez spécifier un montant valide (supérieur à 0)")
        return
    
    if recipient == ctx.author:
        await ctx.send("❌ Vous ne pouvez pas vous payer vous-même!")
        return
    
    if recipient.bot:
        await ctx.send("❌ Vous ne pouvez pas payer un bot!")
        return
    
    # Message de traitement
    loading_msg = await ctx.send("🔄 Traitement du paiement...")
    
    try:
        # Vérifier que l'expéditeur a un compte Privy
        sender_data = await privy_api.get_user_by_discord_id(ctx.author.id)
        if not sender_data:
            await loading_msg.edit(content="❌ **Erreur expéditeur:** Aucun compte Privy trouvé lié à votre Discord.\n"
                                          "Connectez-vous d'abord sur notre application avec Discord.")
            return
        
        # Vérifier que le destinataire a un compte Privy
        recipient_data = await privy_api.get_user_by_discord_id(recipient.id)
        if not recipient_data:
            await loading_msg.edit(content=f"❌ **Erreur destinataire:** {recipient.mention} n'a pas de compte Privy lié.\n"
                                          "Le destinataire doit d'abord se connecter sur notre application.")
            return
        
        # Récupérer les wallets de l'expéditeur
        sender_wallets = await privy_api.get_user_wallets(sender_data)
        if not sender_wallets or not sender_wallets.get('wallets'):
            await loading_msg.edit(content="❌ **Erreur expéditeur:** Aucun wallet trouvé pour votre compte.")
            return
        
        # Récupérer les wallets du destinataire
        recipient_wallets = await privy_api.get_user_wallets(recipient_data)
        if not recipient_wallets or not recipient_wallets.get('wallets'):
            await loading_msg.edit(content=f"❌ **Erreur destinataire:** {recipient.mention} n'a pas de wallet configuré.")
            return
        
        # Prendre le premier wallet de chaque utilisateur (Sepolia par défaut)
        sender_wallet = None
        recipient_wallet = None
        
        # Chercher un wallet Sepolia en priorité, puis Ethereum
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
        
        # Si pas de wallet Ethereum, prendre le premier disponible
        if not sender_wallet and sender_wallets['wallets']:
            sender_wallet = sender_wallets['wallets'][0]
        
        if not recipient_wallet and recipient_wallets['wallets']:
            recipient_wallet = recipient_wallets['wallets'][0]
        
        if not sender_wallet or not recipient_wallet:
            await loading_msg.edit(content="❌ Impossible de trouver des wallets compatibles pour la transaction.")
            return
        
        # Détails techniques - calculer les chaînes avant de les utiliser
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
        
        # Générer un ID unique pour le paiement
        payment_id = str(uuid.uuid4())
        
        # Stocker les informations du paiement
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
            'status': 'pending',
            'guild_id': ctx.guild.id,
            'channel_id': ctx.channel.id
        }
        
        pending_payments[payment_id] = payment_data
        save_pending_payments()
        
        # URL de confirmation du paiement (adaptez l'URL selon votre configuration)
        confirmation_url = f"http://localhost:5173/confirm-payment/{payment_id}"
        
        # Créer l'embed de paiement
        embed = discord.Embed(
            title="💸 Demande de Paiement",
            description="Cliquez sur le lien ci-dessous pour confirmer la transaction",
            color=0xffaa00,
            timestamp=datetime.now()
        )
        
        # Informations de la transaction
        embed.add_field(
            name="👤 Expéditeur",
            value=f"{ctx.author.mention}\n`{sender_wallet['address'][:10]}...{sender_wallet['address'][-8:]}`",
            inline=True
        )
        
        embed.add_field(
            name="👤 Destinataire", 
            value=f"{recipient.mention}\n`{recipient_wallet['address'][:10]}...{recipient_wallet['address'][-8:]}`",
            inline=True
        )
        
        embed.add_field(
            name="💰 Montant",
            value=f"**{amount} {currency.upper()}**",
            inline=True
        )
        
        # Détails techniques
        embed.add_field(
            name="⛓️ Réseau Expéditeur",
            value=sender_chain,
            inline=True
        )
        
        embed.add_field(
            name="⛓️ Réseau Destinataire", 
            value=recipient_chain,
            inline=True
        )
        
        embed.add_field(
            name="🆔 Transaction ID",
            value=f"`PAY-{ctx.message.id}`",
            inline=True
        )
        
        # Adresses complètes
        embed.add_field(
            name="📍 Adresse Expéditeur",
            value=f"`{sender_wallet['address']}`",
            inline=False
        )
        
        embed.add_field(
            name="📍 Adresse Destinataire",
            value=f"`{recipient_wallet['address']}`",
            inline=False
        )
        
        # Ajouter le lien de confirmation
        embed.add_field(
            name="🔗 Confirmer le paiement",
            value=f"[Cliquez ici pour confirmer la transaction]({confirmation_url})",
            inline=False
        )
        
        # Ajouter note pour Sepolia
        testnet_warning = ""
        if "Sepolia" in sender_chain or "Sepolia" in recipient_chain:
            testnet_warning = "\n🚨 **TESTNET SEPOLIA** - Utilisez des ETH de test uniquement!"
        
        embed.add_field(
            name="⚠️ Important",
            value=f"Cliquez sur le lien pour être redirigé vers l'interface web et confirmer votre paiement.\n"
                  f"Ce lien expire dans 24 heures.{testnet_warning}",
            inline=False
        )
        
        embed.set_footer(text=f"PayBot • ID: {payment_id[:8]}")
        
        # Envoyer l'embed
        await loading_msg.edit(content="", embed=embed)
        
        # Notification au destinataire avec lien
        try:
            dm_embed = discord.Embed(
                title="💰 Vous avez reçu une demande de paiement!",
                description=f"{ctx.author.mention} souhaite vous envoyer **{amount} {currency.upper()}**",
                color=0x00ff00
            )
            dm_embed.add_field(
                name="💼 Votre wallet",
                value=f"`{recipient_wallet['address']}`",
                inline=False
            )
            dm_embed.add_field(
                name="🔗 Voir le paiement",
                value=f"[Cliquez ici pour voir les détails]({confirmation_url})",
                inline=False
            )
            
            await recipient.send(embed=dm_embed)
        except discord.Forbidden:
            await ctx.send(f"📬 {recipient.mention}, vous avez reçu une demande de paiement ci-dessus!")
        
    except Exception as e:
        await loading_msg.edit(content=f"❌ Erreur lors du traitement du paiement: {str(e)}")
        print(f"❌ Erreur dans pay_command: {e}")

# Nouvelle commande pour vérifier le statut d'un paiement
@bot.command(name='payment')
async def payment_status(ctx, payment_id: str = None):
    """Vérifie le statut d'un paiement"""
    if not payment_id:
        await ctx.send("❌ **Usage:** `$payment <ID_paiement>`")
        return
    
    payment = pending_payments.get(payment_id)
    if not payment:
        await ctx.send("❌ Paiement non trouvé ou expiré.")
        return
    
    embed = discord.Embed(
        title=f"📊 Statut du Paiement",
        color=0x00ff00 if payment['status'] == 'completed' else 0xffaa00,
        timestamp=datetime.now()
    )
    
    embed.add_field(name="🆔 ID", value=f"`{payment_id}`", inline=True)
    embed.add_field(name="📊 Statut", value=payment['status'], inline=True)
    embed.add_field(name="💰 Montant", value=f"{payment['amount']} {payment['currency']}", inline=True)
    embed.add_field(name="👤 Expéditeur", value=payment['sender_name'], inline=True)
    embed.add_field(name="👤 Destinataire", value=payment['recipient_name'], inline=True)
    embed.add_field(name="📅 Date", value=payment['timestamp'][:19], inline=True)
    
    await ctx.send(embed=embed)

# Nouvelle commande pour obtenir des ETH de test Sepolia
@bot.command(name='faucet')
async def faucet_command(ctx):
    """Fournit des liens vers les faucets Sepolia"""
    
    embed = discord.Embed(
        title="🚰 Faucets Sepolia Testnet",
        description="Obtenez des ETH de test pour Sepolia",
        color=0x00ff00,
        timestamp=datetime.now()
    )
    
    embed.add_field(
        name="🔗 Faucets recommandés",
        value="• [Sepolia Faucet](https://sepoliafaucet.com/)\n"
              "• [Alchemy Sepolia Faucet](https://sepoliafaucet.net/)\n"
              "• [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia)\n"
              "• [Infura Faucet](https://www.infura.io/faucet/sepolia)",
        inline=False
    )
    
    embed.add_field(
        name="📋 Instructions",
        value="1. Utilisez `$wallet` pour obtenir votre adresse\n"
              "2. Visitez un des faucets ci-dessus\n"
              "3. Collez votre adresse de wallet\n"
              "4. Récupérez vos ETH de test gratuits",
        inline=False
    )
    
    embed.add_field(
        name="⚠️ Important",
        value="• Les ETH Sepolia n'ont aucune valeur réelle\n"
              "• Utilisés uniquement pour les tests\n"
              "• Limite quotidienne par faucet",
        inline=False
    )
    
    await ctx.send(embed=embed)


# Charger les paiements en attente au démarrage
load_pending_payments()

# Lancer le bot
if __name__ == '__main__':
    try:
        print("🚀 Démarrage du bot...")
        bot.run(config['discord_token'])
    except discord.errors.LoginFailure:
        print("❌ Token Discord invalide! Vérifiez votre token dans config.json")
    except KeyError as e:
        print(f"❌ Clé manquante dans config.json: {e}")
        print("📝 Assurez-vous d'avoir: discord_token, privy_app_id, privy_app_secret")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
    finally:
        # Nettoyage
        asyncio.run(privy_api.close())