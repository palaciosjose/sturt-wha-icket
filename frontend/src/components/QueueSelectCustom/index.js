import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import Chip from "@material-ui/core/Chip";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
	chips: {
		display: "flex",
		flexWrap: "wrap",
		gap: "4px",
		maxWidth: "100%",
		alignItems: "flex-start",
	},
	chip: {
		margin: 1,
		maxWidth: "100%",
		height: "auto",
		"& .MuiChip-label": {
			whiteSpace: "normal",
			wordBreak: "break-word",
			lineHeight: "1.2",
			padding: "4px 8px",
			fontSize: "0.75rem",
		},
	},
	selectContainer: {
		"& .MuiSelect-select": {
			minHeight: "40px",
			display: "flex",
			alignItems: "flex-start",
			padding: "8px 12px",
		},
	},
}));

const QueueSelectCustom = ({ selectedQueueIds, companyId, onChange }) => {
	const classes = useStyles();
	const [queues, setQueues] = useState([]);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get("/queue", {
					params: { companyId }
				});
				setQueues(data);
			} catch (err) {
				toastError(err);
			}
		})();
	}, [companyId]);

	const handleChange = e => {
		onChange(e.target.value);
	};

	return (
		<div style={{ marginTop: 6 }}>
			<FormControl fullWidth margin="dense" variant="outlined" className={classes.selectContainer}>
				<InputLabel>{i18n.t("queueSelect.inputLabel")}</InputLabel>
				<Select
					multiple
					labelWidth={60}
					value={selectedQueueIds}
					onChange={handleChange}
					MenuProps={{
						anchorOrigin: {
							vertical: "bottom",
							horizontal: "left",
						},
						transformOrigin: {
							vertical: "top",
							horizontal: "left",
						},
						getContentAnchorEl: null,
					}}
					renderValue={selected => (
						<div className={classes.chips}>
							{selected?.length > 0 &&
								selected.map(id => {
									const queue = queues.find(q => q.id === id);
									return queue ? (
										<Chip
											key={id}
											style={{ backgroundColor: queue.color }}
											variant="outlined"
											label={queue.name}
											className={classes.chip}
										/>
									) : null;
								})}
						</div>
					)}
				>
					{queues.map(queue => (
						<MenuItem key={queue.id} value={queue.id}>
							{queue.name}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</div>
	);
};

export default QueueSelectCustom;
