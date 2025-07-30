import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";

import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete, {
	createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";

const filterOptions = createFilterOptions({
	trim: true,
});

const TransferTicketModal = ({ modalOpen, onClose, ticketid }) => {
	const history = useHistory();
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [selectedUser, setSelectedUser] = useState(null);
	const [autocompleteOpen, setAutocompleteOpen] = useState(false);

	useEffect(() => {
		if (!modalOpen) {
			setLoading(false);
			return;
		}

		// ✅ CARGAR USUARIOS AUTOMÁTICAMENTE AL ABRIR EL MODAL
		const fetchUsers = async () => {
			setLoading(true);
			try {
				const { data } = await api.get("/users/", {
					params: { 
						searchParam: searchParam || "", // Si no hay búsqueda, traer todos
						limit: 10 // Limitar a 10 usuarios inicialmente
					},
				});
				setOptions(data.users);
				setLoading(false);
			} catch (err) {
				setLoading(false);
				toastError(err);
			}
		};

		// ✅ CARGAR INMEDIATAMENTE AL ABRIR EL MODAL
		fetchUsers();
	}, [modalOpen]);

	// ✅ BÚSQUEDA CON DEBOUNCE
	useEffect(() => {
		if (!modalOpen || !searchParam || searchParam.length < 2) {
			return;
		}

		const delayDebounceFn = setTimeout(() => {
			const fetchUsers = async () => {
				setLoading(true);
				try {
					const { data } = await api.get("/users/", {
						params: { 
							searchParam,
							limit: 10
						},
					});
					setOptions(data.users);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};

			fetchUsers();
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, modalOpen]);

	const handleClose = () => {
		onClose();
		setSearchParam("");
		setSelectedUser(null);
		setAutocompleteOpen(false);
		setOptions([]);
	};

	const handleSaveTicket = async e => {
		e.preventDefault();
		if (!ticketid || !selectedUser) return;
		setLoading(true);
		try {
			await api.put(`/tickets/${ticketid}`, {
				userId: selectedUser.id,
				queueId: null,
				status: "open",
			});
			setLoading(false);
			history.push(`/tickets`);
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	return (
		<Dialog open={modalOpen} onClose={handleClose} maxWidth="lg" scroll="paper">
			<form onSubmit={handleSaveTicket}>
				<DialogTitle id="form-dialog-title">
					{i18n.t("transferTicketModal.title")}
				</DialogTitle>
				<DialogContent dividers>
					<Autocomplete
						style={{ width: 400 }}
						getOptionLabel={option => `${option.name}`}
						onChange={(e, newValue) => {
							setSelectedUser(newValue);
						}}
						options={options}
						filterOptions={(options, { inputValue }) => {
							// ✅ FILTRO MEJORADO: Buscar por nombre y email
							return options.filter(option => {
								const searchTerm = inputValue.toLowerCase();
								return (
									option.name?.toLowerCase().includes(searchTerm) ||
									option.email?.toLowerCase().includes(searchTerm)
								);
							});
						}}
						freeSolo={false}
						autoHighlight
						noOptionsText={i18n.t("transferTicketModal.noOptions")}
						loading={loading}
						open={autocompleteOpen}
						onOpen={() => {
							// ✅ ABRIR AUTCOMPLETE Y CARGAR USUARIOS
							setAutocompleteOpen(true);
							if (options.length === 0) {
								setSearchParam("");
							}
						}}
						onClose={() => {
							setAutocompleteOpen(false);
						}}
						ListboxProps={{
							style: { maxHeight: 200 }, // ✅ SCROLL CON ALTURA MÁXIMA
						}}
						renderInput={params => (
							<TextField
								{...params}
								label={i18n.t("transferTicketModal.fieldLabel")}
								variant="outlined"
								required
								autoFocus
								onChange={e => {
									setSearchParam(e.target.value);
								}}
								placeholder="Click aquí para ver usuarios disponibles"
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<React.Fragment>
											{loading ? (
												<CircularProgress color="inherit" size={20} />
											) : null}
											{params.InputProps.endAdornment}
										</React.Fragment>
									),
								}}
							/>
						)}
						renderOption={(option) => (
							<div style={{ 
								display: 'flex', 
								flexDirection: 'column',
								padding: '8px 0'
							}}>
								<div style={{ fontWeight: 'bold' }}>
									{option.name}
								</div>
								{option.email && (
									<div style={{ 
										fontSize: '12px', 
										color: '#666',
										marginTop: '2px'
									}}>
										{option.email}
									</div>
								)}
							</div>
						)}
					/>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={handleClose}
						color="secondary"
						disabled={loading}
						variant="outlined"
					>
						{i18n.t("transferTicketModal.buttons.cancel")}
					</Button>
					<ButtonWithSpinner
						variant="contained"
						type="submit"
						color="primary"
						loading={loading}
					>
						{i18n.t("transferTicketModal.buttons.ok")}
					</ButtonWithSpinner>
				</DialogActions>
			</form>
		</Dialog>
	);
};

export default TransferTicketModal;
