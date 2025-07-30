import React, { useState, useEffect } from "react";

import { Avatar, CardHeader, Tooltip, Box } from "@material-ui/core";
import { blue, green, orange } from "@material-ui/core/colors";
import AndroidIcon from "@material-ui/icons/Android";
import EmojiEmotionsIcon from "@material-ui/icons/EmojiEmotions";
import SettingsIcon from "@material-ui/icons/Settings";
import { getInitials } from "../../helpers/getInitials";
import { generateColor } from "../../helpers/colorGenerator";
import { i18n } from "../../translate/i18n";

const TicketInfo = ({ contact, ticket, onClick }) => {
	const { user } = ticket
	const [userName, setUserName] = useState('')
	const [contactName, setContactName] = useState('')

	useEffect(() => {
		if (contact) {
			setContactName(contact.name);
			if(document.body.offsetWidth < 600) {
				if (contact.name.length > 10) {
					const truncadName = contact.name.substring(0, 10) + '...';
					setContactName(truncadName);
				}
			}
		}

		if (user && contact) {
			setUserName(`${i18n.t("messagesList.header.assignedTo")} ${user.name}`);

			if(document.body.offsetWidth < 600) {
				setUserName(`${user.name}`);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer" }}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true }}
			avatar={        <Avatar
          style={{ backgroundColor: generateColor(contact?.number), color: "white", fontWeight: "bold" }}
          src={contact.profilePicUrl}
          alt="contact_image">
          {getInitials(contact?.name)}
        </Avatar>}
			title={`${contactName} #${ticket.id}`}
			subheader={
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<span>{ticket.user && `${userName}`}</span>
					
					{/* ✅ INDICADORES DE AGENTE IA */}
					<Box display="flex" alignItems="center">
						{ticket.chatbot && (
							<Tooltip title="🤖 Agente IA - Chatbot activo">
								<AndroidIcon
									fontSize="small"
									style={{ 
										color: blue[600], 
										fontSize: '16px',
										marginLeft: '5px'
									}}
								/>
							</Tooltip>
						)}
						
						{ticket.promptId && (
							<Tooltip title="🧠 IA Inteligente - Prompt configurado">
								<EmojiEmotionsIcon
									fontSize="small"
									style={{ 
										color: green[600], 
										fontSize: '16px',
										marginLeft: '5px'
									}}
								/>
							</Tooltip>
						)}
						
						{ticket.useIntegration && (
							<Tooltip title="🔗 Integración Externa - N8N/Dialogflow">
								<SettingsIcon
									fontSize="small"
									style={{ 
										color: orange[600], 
										fontSize: '16px',
										marginLeft: '5px'
									}}
								/>
							</Tooltip>
						)}
					</Box>
				</Box>
			}
		/>
	);
};

export default TicketInfo;
