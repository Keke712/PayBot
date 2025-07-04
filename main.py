import discord
from discord.ext import commands
import json
import os

# Fonction pour charger la configuration
def load_config():
    """Charge la configuration depuis le fichier config.json"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("❌ Fichier config.json non trouvé!")
        print("📝 Créez un fichier config.json avec votre token:")
        print('{\n  "token": "VOTRE_TOKEN_ICI"\n}')
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

# Gestion des erreurs de commandes
@bot.event
async def on_command_error(ctx, error):
    if isinstance(error, commands.CommandNotFound):
        # Ignorer les commandes qui n'existent pas
        return
    else:
        print(f'❌ Erreur dans la commande: {error}')
        await ctx.send('Une erreur s\'est produite lors de l\'exécution de la commande.')

# Événement optionnel : réagir aux messages (sans commande)
@bot.event
async def on_message(message):
    # Ignorer les messages du bot lui-même
    if message.author == bot.user:
        return
    
    # Traiter les commandes normalement
    await bot.process_commands(message)

# Lancer le bot
if __name__ == '__main__':
    try:
        print("🚀 Démarrage du bot...")
        bot.run(config['token'])
    except discord.errors.LoginFailure:
        print("❌ Token invalide! Vérifiez votre token dans config.json")
    except KeyError:
        print("❌ Clé 'token' manquante dans config.json")
        print("📝 Format attendu: {'token': 'VOTRE_TOKEN_ICI'}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")