import discord
from discord.ext import commands
import json
import aiohttp
import asyncio
from datetime import datetime

# Fonction pour charger la configuration
def load_config():
    """Charge la configuration depuis le fichier config.json"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Fichier config.json non trouvé!")
        print("📝 Créez un fichier config.json avec vos tokens:")
        print('{\n  "discord_token": "VOTRE_TOKEN_DISCORD",\n  "privy_app_id": "VOTRE_PRIVY_APP_ID",\n  "privy_app_secret": "VOTRE_PRIVY_APP_SECRET"\n}')
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

# Initialiser l'API Privy
privy_api = PrivyAPI(config['privy_app_id'], config['privy_app_secret'])

# Événement déclenché quand le bot est prêt
@bot.event
async def on_ready():
    print(f'✅ Bot connecté en tant que {bot.user.name}!')
    print(f'🆔 ID du bot: {bot.user.id}')
    print(f'🌐 Le bot est présent sur {len(bot.guilds)} serveur(s)')
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
        
        embed.set_footer(text="Informations récupérées depuis Privy.io")
        
        await loading_msg.edit(content="", embed=embed)
        
    except Exception as e:
        await loading_msg.edit(content=f"❌ Erreur lors de la récupération des informations: {str(e)}")
        print(f"❌ Erreur dans wallet_command: {e}")

# Commande $test simplifiée
@bot.command(name='test')
async def test_command(ctx):
    """Teste la connexion à l'API Privy"""
    loading_msg = await ctx.send("🔍 Test de la connexion à l'API Privy...")
    
    try:
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
                    title="✅ Connexion API réussie",
                    color=0x00ff00,
                    timestamp=datetime.now()
                )
                embed.add_field(name="👥 Total utilisateurs", value=str(total_users), inline=True)
                embed.add_field(name="🎮 Avec Discord", value=str(discord_users), inline=True)
                embed.add_field(name="🔗 Méthode", value="Basic Auth", inline=True)
                
                await loading_msg.edit(content="", embed=embed)
            else:
                await loading_msg.edit(content=f"❌ Erreur API: {response.status}")
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