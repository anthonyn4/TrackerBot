//Todo:
// Show which players were in party (party-id)
// Map score

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActionRow, ComponentType} = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

function createEmbed(player){
	const mmr_change = player.mmr.data[0].mmr_change_to_last_game > 0 ? `+${player.mmr.data[0].mmr_change_to_last_game}` : `${player.mmr.data[0].mmr_change_to_last_game}`;	//append "+" if positive

	const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('back')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('⬅️')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('refresh')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🔄')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('next')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('➡️')
			)
			.addComponents(
				new ButtonBuilder()
					.setCustomId('destruct')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('❌')
			)
	const result = new EmbedBuilder()
		.setColor('fa4454')
		.setAuthor({name: `Statistics for ${player.mmr.name}#${player.mmr.tag} - ${player.region.toUpperCase()}`, url: `https://tracker.gg/valorant/profile/riot/${player.ign}/overview`})
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
		return [result, row];
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
			return i.message.interaction.id === interaction.id;	//to make sure button press only affects attached message
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
		let [embed, buttons] = createEmbed(player);
		await interaction.followUp({embeds: [embed], components: [buttons]});

		collector.on('collect', async i => {
			if (i.customId === 'refresh') {
				console.log(`${i.user.username} refreshed data for ${username}#${tagline}`);
				buttons.components.find(button => button.data.custom_id == 'refresh').setDisabled(true); //disable refresh button while data is being updated
				await i.update({embeds: [embed], components: [buttons]});
				const new_data = await getValorantData(username, tagline, region);
				let [new_embed, new_buttons] = createEmbed(new_data);
				await i.editReply({embeds: [new_embed], components: [new_buttons]});
			} else if (i.customId === 'destruct'){
				await i.message.delete();
				console.log(`boom`);
			} else if (i.customId === 'next') {

			} else if (i.customId === 'back') {

			}
			
		})
	},
	//getValorantData,
	//createEmbed
};