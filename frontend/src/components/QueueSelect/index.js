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

const QueueSelect = ({ selectedQueueIds, onChange, multiple = true, title = i18n.t("queueSelect.inputLabel") }) => {
	const classes = useStyles();
	const [queues, setQueues] = useState([]);

	useEffect(() => {

		fetchQueues();

	}, []);

	const fetchQueues = async () => {
		try {
			const { data } = await api.get("/queue");
			setQueues(data);
		} catch (err) {
			toastError(err);
		}
	}

	const handleChange = e => {
		onChange(e.target.value);
	};

	return (
		<div >
			<FormControl fullWidth margin="dense" variant="outlined" className={classes.selectContainer}>
				<InputLabel shrink={selectedQueueIds ? true : false} >{title}</InputLabel>
				<Select
					label={title}
					multiple={multiple}
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

					renderValue={selected => {
						if (!selected || selected === null) {
							return <span style={{ color: '#999' }}>Seleccionar...</span>;
						}
						
						if (multiple) {
							return (
								<div className={classes.chips}>
									{selected?.length > 0 ? (
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
										})
									) : null}
								</div>
							);
						} else {
							// ✅ SELECCIÓN ÚNICA
							const queue = queues.find(q => q.id === selected);
							
							if (queue) {
								return (
									<Chip
										key={selected}
										variant="outlined"
										style={{ backgroundColor: queue.color }}
										label={queue.name}
										className={classes.chip}
									/>
								);
							} else {
								return <span style={{ color: '#999' }}>Seleccionar...</span>;
							}
						}
					}}
				>
					{!multiple && <MenuItem value="">Ninguna</MenuItem>}
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

export default QueueSelect;
