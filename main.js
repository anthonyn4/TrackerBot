const fs = require('node:fs');
const path = require('node:path');
const Discord = require('discord.js');
const {Client, GatewayIntentBits, Partials, Events, EmbedBuilder, AttachmentBuilder} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { token } = require('./config.json');

const client = new Client({ 
    intents: [    
        GatewayIntentBits.Guilds,
    ],
    partials: [Partials.Channel],
});

client.commands = new Discord.Collection()


client.once(Events.ClientReady, c => {
	console.log(`Tracker is online!`);
});


























client.login(token);