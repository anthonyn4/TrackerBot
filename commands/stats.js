const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Get VALORANT stats of any player.')
		.addStringOption(option =>
			option.setName('username')
				.setDescription('The player name to search.')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('tagline')
				.setDescription('The corresponding player tag.')
				.setRequired(true))
		.addStringOption(option => 
			option.setName('region')
				.setDescription('The player\'s region.')
				.setRequired(true)
				.addChoices(
					{name: 'NA', value: 'na'},
					{name: 'EU', value: 'eu'},
					{name: 'KR', value: 'kr'},
					{name: 'AP', value: 'ap'},
					{name: 'BR', value: 'na'},
					{name: 'LATAM', value: 'na'},
				)),
	async execute(interaction) {
		const [username, tagline, region] = [interaction.options.getString('username'),
											interaction.options.getString('tagline'),
											interaction.options.getString('region')];
		const ign = encodeURIComponent(`${username}#${tagline}`); //for tracker.gg url
		const player = {mmr_change_data: []}; //player data
		try {
			await interaction.deferReply(); //give API time to retrieve data
			console.log(`${interaction.user.username} searched for '${username}#${tagline} ${region}'`);
			const account = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(username)}/${tagline}`);
			player.account = await account.json();
			const mmr = await fetch(`https://api.henrikdev.xyz/valorant/v1/mmr-history/${region}/${encodeURIComponent(username)}/${tagline}`);
			player.mmr = await mmr.json();
			const history = await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/na/${encodeURIComponent(username)}/${tagline}?filter=competitive`)
			player.history = await history.json();
			const game = player.history.data[0].players.all_players.filter(players => players.name === `${player.mmr.name}`);
			//console.log(game);

			if (player.account.status != '200' || player.mmr.status != '200' || player.history.status != '200'){
				console.log(`Failed to find player ${username}#${tagline}`)
				await interaction.reply({content: `Failed to find player ${username}#${tagline} ${region}`, ephemeral:true});
			} else {
				console.log(`Found results for ${player.mmr.name}#${player.mmr.tag} ${region}`);
				let total_mmr_change = 0;
				for (let match of player.mmr.data){
					player.mmr_change_data.push(match.mmr_change_to_last_game);
					total_mmr_change += match.mmr_change_to_last_game;
				}
				const start_date = player.mmr.data[player.mmr.data.length-1].date.split(",")[1];
				const end_date = player.mmr.data[0].date.split(",")[1];
				const total_shots = game[0].stats.headshots+game[0].stats.bodyshots+game[0].stats.legshots;
				player.headshot = game[0].stats.headshots/(total_shots)*100;
				const mmr_change = player.mmr.data[0].mmr_change_to_last_game > 0 ? `+${player.mmr.data[0].mmr_change_to_last_game}` : `${player.mmr.data[0].mmr_change_to_last_game}`;
				const result = new EmbedBuilder()
					.setColor('fa4454')
					.setAuthor({name: `Statistics for ${player.mmr.name}#${player.mmr.tag} - ${region.toUpperCase()}`, url: `https://tracker.gg/valorant/profile/riot/${ign}/overview`})
					.setThumbnail(`${player.mmr.data[0].images.small}`)
					//.setTitle(`Statistics for ${player.mmr.data.name}#${player.mmr.data.tag}`)
					.addFields(
						{name: 'Level', value: `${player.account.data.account_level}`, inline: true},
						//{name: 'Region', value: `${player.account.data.region}`, inline: true}, //redundant
						{name: 'Rank', value: `${player.mmr.data[0].currenttierpatched} (${player.mmr.data[0].ranking_in_tier} RR)`, inline: true},
						{name: `Change in ${player.mmr.data.length} games`, value: `${total_mmr_change} RR`, inline: true},
						//{name: `MMR History`, value: `${player.mmr_change_data}`}
						//{name: '--------------------------------------------------------------------', value: "**-------------------------------------------------------------------**"}
					)
					.addFields(
						{name: `Last game statistics`, value: `${mmr_change} RR`},
						{name: 'Map', value: `${player.history.data[0].metadata.map}`},
						{name: 'Agent', value: `${game[0].character}`, inline: true},
						//{name: 'Mode', value: `${player.history.data[0].metadata.mode}`, inline:true},
						{name: 'K/D/A', value: `${game[0].stats.kills}/${game[0].stats.deaths}/${game[0].stats.assists}`, inline:true},
						{name: 'HS', value: `${player.headshot.toFixed(1)}%`, inline:true},
						//{name: '\u200b', value: `\u200b`, inline:true},
					)
					.setImage(player.account.data.card.wide)
					.setFooter({text: `Last updated: ${player.account.data.last_update}`});
				await interaction.editReply({embeds: [result]});
			} 
		} catch (error) {
			console.error(error);
			await interaction.editReply({ content: `${error}`, ephemeral: true });
			await wait(10000); //10 seconds
			await interaction.deleteReply();
		}
	}
};