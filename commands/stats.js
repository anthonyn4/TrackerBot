//Todo:
// Show which players were in party (party-id)
// Map score

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActionRow, ComponentType} = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getDataForUser(username, tagline, region){
	const player = {mmr_change_data: [],
					games: [],
					stats: {
						headshots: []
					}}; //player data
		//player.account = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(username)}/${tagline}`).json();
		player.mmr = await (await fetch(`https://api.henrikdev.xyz/valorant/v1/mmr-history/${region}/${encodeURIComponent(username)}/${tagline}`)).json();
		player.history = await (await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/na/${encodeURIComponent(username)}/${tagline}?filter=competitive`)).json();

		if (player.mmr.status != '200' || player.history.status != '200'){
			console.log(`Failed to find player ${username}#${tagline}`)
			return 0;
		} else {

			// if(!player.games.length) {
			// 	console.log(`No games found for ${player.mmr.name}#${player.mmr.tag} ${region}`);
			// 	return await interaction.editReply(`No games found for ${player.mmr.name}#${player.mmr.tag}`);
			// }
			console.log(`Found results for ${player.mmr.name}#${player.mmr.tag} ${region}`);
			for (let match of player.history.data) {	//generate player only data
				player.games.push(match.players.all_players.find(players => players.name.toUpperCase() === `${username.toUpperCase()}`));
			}
			for (let game of player.games) {
				const hs = game.stats.headshots/(game.stats.bodyshots + game.stats.headshots + game.stats.legshots)*100;
				player.stats.headshots.push(hs);
			}
			let total_mmr_change = 0;
			for (let match of player.mmr.data){	//calculate total mmr change between all data points
				player.mmr_change_data.push(match.mmr_change_to_last_game);
				total_mmr_change += match.mmr_change_to_last_game;
			}
			player.mmr_change_data.push(total_mmr_change);
			//const start_date = player.mmr.data[player.mmr.data.length-1].date.split(",")[1];
			//const end_date = player.mmr.data[0].date.split(",")[1];
		
			player.stats.average = player.stats.headshots.reduce((a,b) => a+b)/player.stats.headshots.length;
			//console.log(player.stats.headshots);
			//console.log(player.stats.average);
		} 
		return player;
}

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
				//.setRequired(true)
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
											interaction.options.getString('region') || 'na'];
		const ign = encodeURIComponent(`${username}#${tagline}`); //for tracker.gg url
		await interaction.deferReply(); //give API time to retrieve data
		console.log(`${interaction.user.username} searched for '${username}#${tagline} ${region}'`);
		const player = await getDataForUser(username,tagline,region);
		if (!player) {await interaction.editReply({content: `Failed to find player ${username}#${tagline} ${region}`, ephemeral:true});}
		const mmr_change = player.mmr.data[0].mmr_change_to_last_game > 0 ? `+${player.mmr.data[0].mmr_change_to_last_game}` : `${player.mmr.data[0].mmr_change_to_last_game}`;	//append "+" if positive

		const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('refresh')
						.setStyle(ButtonStyle.Primary)
						.setEmoji('🔄')
				)
		const result = new EmbedBuilder()
			.setColor('fa4454')
			.setAuthor({name: `Statistics for ${player.mmr.name}#${player.mmr.tag} - ${region.toUpperCase()}`, url: `https://tracker.gg/valorant/profile/riot/${ign}/overview`})
			.setThumbnail(`${player.mmr.data[0].images.small}`)
			//.setTitle(`Statistics for ${player.mmr.data.name}#${player.mmr.data.tag}`)
			.addFields(
				//{name: 'Level', value: `${player.account.data.account_level}`, inline: true},
				//{name: 'Region', value: `${player.account.data.region}`, inline: true}, //redundant
				{name: 'Rank', value: `${player.mmr.data[0].currenttierpatched} (${player.mmr.data[0].ranking_in_tier} RR)`, inline: true},
				{name: `ELO`, value: `${player.mmr.data[0].elo}`, inline:true},
				{name: `Change in ${player.mmr.data.length} games`, value: `${player.mmr_change_data.slice(-1)[0]} RR`, inline: true},
				//{name: `HS in ${player.stats.headshots.length} games`, value: `${player.stats.average.toFixed(1)}%`, inline:true},
				//{name: `MMR History`, value: `${player.mmr_change_data}`}
				//{name: '--------------------------------------------------------------------', value: "**-------------------------------------------------------------------**"}
			)
			.addFields(
				{name: `Last game statistics`, value: `${mmr_change} RR`},
				{name: 'Map', value: `${player.history.data[0].metadata.map}`},
				{name: 'Agent', value: `${player.games[0].character}`, inline: true},
				//{name: 'Mode', value: `${player.history.data[0].metadata.mode}`, inline:true},
				{name: 'K/D/A', value: `${player.games[0].stats.kills}/${player.games[0].stats.deaths}/${player.games[0].stats.assists}`, inline:true},
				{name: 'HS', value: `${player.stats.headshots[0].toFixed(1)}%`, inline:true},
				//{name: '\u200b', value: `\u200b`, inline:true},
			)
			.setImage(player.games[0].assets.card.wide)
			//.setFooter({text: `Last updated: ${player.account.data.last_update}`});
		await interaction.editReply({embeds: [result], components: [row]});
	}
};