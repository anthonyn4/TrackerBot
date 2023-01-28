//Todo:
// Show which players were in party (party-id)
// Leaderboard

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActionRow, ComponentType} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
//const {get, set} = require('./cache.js');
let game_number = 0;

async function getValorantData(username, tagline, region){
	const player = {mmr_change_data: [],
					games: [],
					stats: {
						headshots: []
					}}; //player data
		//player.account = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(username)}/${tagline}`).json();
		player.mmr = await (await fetch(`https://api.henrikdev.xyz/valorant/v1/mmr-history/${region}/${encodeURIComponent(username)}/${tagline}`)).json();
		player.history = await (await fetch(`https://api.henrikdev.xyz/valorant/v3/matches/na/${encodeURIComponent(username)}/${tagline}?filter=competitive`)).json();
		player.region = region;
		player.ign = encodeURIComponent(`${username}#${tagline}`); //for tracker.gg url
		if (player.mmr.status != '200' || player.history.status != '200'){
			console.log(`MMR Status ${player.mmr.status}`);
			console.log(`History Status ${player.history.status}`);
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
			player.total_mmr_change = 0;
			for (let match of player.mmr.data){	//calculate total mmr change between all data points
				player.mmr_change_data.push(match.mmr_change_to_last_game);
				player.total_mmr_change += match.mmr_change_to_last_game;
			}
			//const start_date = player.mmr.data[player.mmr.data.length-1].date.split(",")[1];
			//const end_date = player.mmr.data[0].date.split(",")[1];
		
			player.stats.average = player.stats.headshots.reduce((a,b) => a+b)/player.stats.headshots.length;
			//console.log(player.stats.headshots);
			//console.log(player.stats.average);
		} 
		return player;
}

//Creates an embed for display of the player's ith game statistics
function createEmbed(player, i){
	let last_change = player.mmr.data[i].mmr_change_to_last_game > 0 ? `+${player.mmr.data[i].mmr_change_to_last_game}` : `${player.mmr.data[i].mmr_change_to_last_game}`;	//append "+" if positive
	if (player.games[i].currenttier_patched == 'Unrated') {
		last_change = '-';
	}

	const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('back')
					.setStyle(ButtonStyle.Secondary)
					.setLabel('🡠')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('refresh')
					.setStyle(ButtonStyle.Secondary)
					.setLabel('⟳')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('next')
					.setStyle(ButtonStyle.Secondary)
					.setLabel('🡢')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('destruct')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('💀')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('scores')
					.setStyle(ButtonStyle.Secondary)
					.setLabel('Scores')
			)
	const result = new EmbedBuilder()
		.setColor('fa4454')
		.setAuthor({name: `Statistics for ${player.mmr.name}#${player.mmr.tag} - ${player.region.toUpperCase()}`, url: `https://tracker.gg/valorant/profile/riot/${player.ign}/overview`})
		.setThumbnail(`${player.mmr.data[i].images.small}`)
		//.setTitle(`Statistics for ${player.mmr.data.name}#${player.mmr.data.tag}`)
		.addFields(
			//{name: 'Level', value: `${player.account.data.account_level}`, inline: true},
			//{name: 'Region', value: `${player.account.data.region}`, inline: true}, //redundant
			{name: 'Current Rank', value: `${player.mmr.data[0].currenttierpatched} (${player.mmr.data[0].ranking_in_tier} RR)`, inline: true},
			//{name: `ELO`, value: `${player.mmr.data[0].elo}`, inline:true},
			{name: `Change in ${player.mmr.data.length} games`, value: `${player.total_mmr_change} RR`, inline: true},
			{name: `HS in ${player.stats.headshots.length} games`, value: `${player.stats.average.toFixed(1)}%`, inline:true},
			//{name: `MMR History`, value: `${player.mmr_change_data}`}
			//{name: '--------------------------------------------------------------------', value: "**-------------------------------------------------------------------**"}
		)
		.addFields(
			{name: `Last game statistics`, value: `${last_change} RR`},
			//{name: '\u200b', value: `\u200b`, inline:true},
			//{name: `Date`, value: `${player.history.data[0].metadata.game_start_patched.split(",")[1]}`, inline: true},

			{name: 'Map', value: `${player.history.data[i].metadata.map}`, inline:true},
			{name: 'Score', value: `${player.history.data[i].teams[player.games[i].team.toLowerCase()].rounds_won}-${player.history.data[i].teams[player.games[i].team.toLowerCase()].rounds_lost}`, inline:true},
			{name: 'Rank (in-game)', value: `${player.games[i].currenttier_patched}`, inline:true},

			{name: 'Agent', value: `${player.games[i].character}`, inline: true},
			//{name: 'Mode', value: `${player.history.data[0].metadata.mode}`, inline:true},
			{name: 'K/D/A', value: `${player.games[i].stats.kills}/${player.games[i].stats.deaths}/${player.games[i].stats.assists}`, inline:true},
			{name: 'HS', value: `${player.stats.headshots[i].toFixed(1)}%`, inline:true},
			//{name: '\u200b', value: `\u200b`, inline:true},
		)
		.setImage(player.games[i].assets.card.wide)
		//.setFooter({text: `Last updated: ${player.account.data.last_update}`});
		return [result, row];
}

function createScoreboard(player,i){ //displays data for last game scores
	player.history.data[i].players.red.sort((a,b) => (a.stats.score < b.stats.score) ? 1 : -1);	//sort the players based on score
	player.history.data[i].players.blue.sort((a,b) => (a.stats.score < b.stats.score) ? 1 : -1);
	let red_team = {characters: '',
					names: '',
					kdas: ''}, 
	blue_team = {characters: '',
					names: '',
					kdas: ''};
	//console.log(player.history.data[0].players.red);
	for (let p of player.history.data[i].players.red){
		//const temp = `${p.character} ${p.name} ${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}\n`;
		red_team.characters += `${p.character}\n`;
		red_team.names += `${p.name}\n`;
		red_team.kdas += `${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}\n`;
	}
	for (let p of player.history.data[i].players.blue){
		//const temp = `${p.character} ${p.name} ${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}\n`;
		blue_team.characters += `${p.character}\n`;
		blue_team.names += `${p.name}\n`;
		blue_team.kdas += `${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}\n`;	
	}
	// let timeline = '';
	// for (let round of player.history.data[0].rounds){
	// 	timeline += (round.winning_team === 'Blue' ? '_ ' : '‾ ')
	// }
	const board = new EmbedBuilder()
		.setColor('69cbb1')
		.setAuthor({name: `Last game scoreboard`, url: `https://tracker.gg/valorant/match/${player.history.data[0].metadata.matchid}?handle=${player.ign}`})
		.addFields(
			{name: '\u200b', value: `\u200b`, inline:true},
			{name: `Red (${player.history.data[i].teams.red.rounds_won})`, value: `\u200b`, inline: true},
			{name: '\u200b', value: `\u200b`, inline:true},
			{name: 'Agent', value: `${red_team.characters}`, inline:true},
			{name: 'Player', value: `${red_team.names}`, inline:true},
			{name: 'K/D/A', value: `${red_team.kdas}`, inline: true},
			
			{name: '\u200b', value: `\u200b`},

			{name: '\u200b', value: `\u200b`, inline:true},
			{name: `Blue (${player.history.data[i].teams.blue.rounds_won})`, value: `\u200b`, inline: true},
			{name: '\u200b', value: `\u200b`, inline:true},
			{name: 'Agent', value: `${blue_team.characters}`, inline:true},
			{name: 'Player', value: `${blue_team.names}`, inline:true},
			{name: 'K/D/A', value: `${blue_team.kdas}`, inline: true},
			
		)
	return board;
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
		
		const filter = i => {			
			//i.deferUpdate();
			return i.message.interaction.id === interaction.id;	//to make sure button press only affects message its attached to
		}
		const collector = interaction.channel.createMessageComponentCollector({filter: filter, componentType: ComponentType.Button});

		const [username, tagline, region] = [interaction.options.getString('username'),
											interaction.options.getString('tagline'),
											interaction.options.getString('region') || 'na'];
		await interaction.deferReply(); //give API time to retrieve data
		console.log(`${interaction.user.username} searched for '${username}#${tagline} ${region}'`);
		const player = await getValorantData(username,tagline,region);
		if (!player) {			
			console.log(`Failed to find player ${username}#${tagline}`)
			await interaction.followUp({content: `Failed to find player ${username}#${tagline} ${region}`});
			return;	
		}
		let [embed, buttons] = createEmbed(player,game_number);;
		await interaction.followUp({embeds: [embed], components: [buttons]});

		
		collector.on('collect', async interaction => {
			let data;
			let match;
			let board;
			switch (interaction.customId) {
				case 'refresh':
					console.log(`${interaction.user.username} refreshed data for ${username}#${tagline}`);
					buttons.components.find(button => button.data.custom_id == 'refresh').setDisabled(true); //disable refresh button while data is being updated
					await interaction.update({embeds: [embed], components: [buttons]});
			
					data = await getValorantData(username, tagline, region);
					message = createEmbed(data, game_number);
					board = createScoreboard(data, game_number);
					await interaction.editReply({embeds: [match.result], components: [match.row]});
					break;
				case 'destruct':
					await interaction.message.delete();
					console.log(`boom`);
					break;
				case 'next':
					game_number = game_number ? --game_number : 0; //subtract if non-zero otherwise return 0
					//console.log(game_number);
					match = createEmbed(player, game_number);
					board = createScoreboard(player, game_number);
					await interaction.update({embeds: [match[0]], components: [match[1]]});
					break;
				case 'back':
					if (game_number < player.games.length-1) {
						game_number++;
					} else {
						game_number = player.games.length-1
					}
					//console.log(game_number);
					match = createEmbed(player, game_number);
					board = createScoreboard(player, game_number);
					await interaction.update({embeds: [match[0]], components: [match[1]]});
					break;
				case 'scores':
					board = createScoreboard(player, game_number);	
					await interaction.update({embeds: [board]});
					break;
			}
			//console.log(cache);
		})
	},
	//getValorantData,
	//createEmbed
};