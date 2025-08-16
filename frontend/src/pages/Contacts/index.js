import React, { useState, useEffect, useReducer, useContext, useRef } from "react";

import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import Checkbox from "@material-ui/core/Checkbox";
import GetAppIcon from "@material-ui/icons/GetApp";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";
import CancelIcon from "@material-ui/icons/Cancel";
import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { SocketContext } from "../../context/Socket/SocketContext";
import { generateColor } from "../../helpers/colorGenerator";
import { getInitials } from "../../helpers/getInitials";


const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;

    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const [deletingContact, setDeletingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const fileUploadRef = useRef(null);

  // Estados para selección múltiple
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [actionType, setActionType] = useState(""); // "delete", "export" o "import"
  const [contactCount, setContactCount] = useState(0);

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: { searchParam, pageNumber },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-contact`, (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ socketManager]);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  // const handleSaveTicket = async contactId => {
  // 	if (!contactId) return;
  // 	setLoading(true);
  // 	try {
  // 		const { data: ticket } = await api.post("/tickets", {
  // 			contactId: contactId,
  // 			userId: user?.id,
  // 			status: "open",
  // 		});
  // 		history.push(`/tickets/${ticket.id}`);
  // 	} catch (err) {
  // 		toastError(err);
  // 	}
  // 	setLoading(false);
  // };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    setLoading(true);
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
    setConfirmOpen(false);
    setDeletingContact(null);
  };

  // Funciones para selección múltiple
  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContacts([]);
      setSelectAll(false);
    } else {
      setSelectedContacts(contacts.map(contact => contact.id));
      setSelectAll(true);
    }
  };

  const handleDeleteSelectedContacts = async () => {
    if (selectedContacts.length === 0) return;
    
    setLoading(true);
    try {
      await api.delete("/contacts/", {
        data: { contactIds: selectedContacts }
      });
      toast.success(i18n.t("contacts.toasts.deletedAll"));
      setSelectedContacts([]);
      setSelectAll(false);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
    setConfirmOpen(false);
  };

  const handleExportSelectedContacts = () => {
    if (selectedContacts.length === 0) return;
    
    // Filtrar solo los contactos seleccionados
    const contactsToExport = contacts.filter(contact => 
      selectedContacts.includes(contact.id)
    );
    
    // Mostrar mensaje de procesamiento para grandes cantidades
    if (selectedContacts.length > 50) {
      toast.info(i18n.t("contacts.messages.processingExport").replace('{count}', selectedContacts.length));
    }
    
    // Usar setTimeout para no bloquear la UI
    setTimeout(() => {
      try {
        // Crear el CSV con los datos filtrados
        const csvData = contactsToExport.map((contact) => ({ 
          name: contact.name || '', 
          number: contact.number || '', 
          email: contact.email || '' 
        }));
        
        // Crear el contenido CSV con encoding UTF-8 BOM para Excel
        const csvHeader = 'name;number;email\n';
        const csvContent = csvData.map(row => 
          `"${row.name.replace(/"/g, '""')}";"${row.number}";"${row.email}"`
        ).join('\n');
        
        const csvString = '\ufeff' + csvHeader + csvContent; // BOM para UTF-8
        
        // Crear y descargar el archivo
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `whaticket_${selectedContacts.length}_contacts_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar la URL del blob
        URL.revokeObjectURL(url);
        
        toast.success(i18n.t("contacts.messages.exportSuccess"));
      } catch (error) {
        console.error('Error al exportar:', error);
        toast.error(i18n.t("contacts.messages.exportError"));
      }
      
      setConfirmOpen(false);
    }, 100);
  };
  
  const handleCheckAgenda = async () => {
    try {
      toast.info(i18n.t("contacts.messages.checkingAgenda"));
      
      const { data: countData } = await api.get("/contacts/count");
      const count = countData.count;
      
      if (count === 0) {
        toast.warning(i18n.t("contacts.messages.agendaEmpty"));
        return;
      }
      
      setContactCount(count);
      setActionType("import");
      setConfirmOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const handleimportContact = async () => {
    try {
      if (!!fileUploadRef.current.files[0]) {
        const formData = new FormData();
        formData.append("file", fileUploadRef.current.files[0]);
        await api.request({
          url: `/contacts/upload`,
          method: "POST",
          data: formData,
        });
      } else {
        // Mostrar mensaje de progreso para grandes cantidades
        if (contactCount > 50) {
          toast.info(i18n.t("contacts.messages.importingContacts").replace('{count}', contactCount));
        }
        
        // Importar los contactos
        await api.post("/contacts/import");
        
        toast.success(i18n.t("contacts.messages.importSuccess"));
      }
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Crear un enlace temporal para descargar el archivo
      const link = document.createElement('a');
      link.href = '/files/plantilla-watoolx-contact.xlsx';
      link.download = 'plantilla-watoolx-contact.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Plantilla descargada correctamente");
    } catch (error) {
      console.error('Error al descargar plantilla:', error);
      toast.error("Error al descargar la plantilla");
    }
  };
  
function getDateLastMessage(contact) {
    if (!contact) return null;
    if (!contact.tickets) return null;

    if (contact.tickets.length > 0) {
        const date = new Date(contact.tickets[contact.tickets.length - 1].updatedAt);

        const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`;
        const month = (date.getMonth() + 1) > 9 ? (date.getMonth() + 1) : `0${date.getMonth() + 1}`;
        const year = date.getFullYear().toString().slice(-2);

        const hours = date.getHours() > 9 ? date.getHours() : `0${date.getHours()}`;
        const minutes = date.getMinutes() > 9 ? date.getMinutes() : `0${date.getMinutes()}`;

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    return null;
}

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer className={classes.mainContainer}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>
      <ConfirmationModal
        title={
          deletingContact
            ? `${i18n.t("contacts.confirmationModal.deleteTitle")} ${
                deletingContact.name
              }?`
            : actionType === "export" && selectedContacts.length > 0
            ? selectedContacts.length === contacts.length
              ? "Exportar todos los contactos"
              : `Exportar ${selectedContacts.length} contacto${selectedContacts.length > 1 ? 's' : ''}`
            : actionType === "import" && contactCount > 0
            ? `${i18n.t("contacts.confirmationModal.importTitle")}`
            : selectedContacts.length > 0
            ? selectedContacts.length === contacts.length
              ? `${i18n.t("contacts.confirmationModal.deleteAllTitle")}`
              : `Eliminar ${selectedContacts.length} contacto${selectedContacts.length > 1 ? 's' : ''}`
            : `${i18n.t("contacts.confirmationModal.importTitle")}`
        }
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setActionType("");
          setContactCount(0);
        }}
        onConfirm={(e) => {
          if (deletingContact) {
            handleDeleteContact(deletingContact.id);
          } else if (actionType === "export" && selectedContacts.length > 0) {
            handleExportSelectedContacts();
          } else if (actionType === "import" && contactCount > 0) {
            handleimportContact();
          } else if (selectedContacts.length > 0) {
            handleDeleteSelectedContacts();
          } else {
            handleimportContact();
          }
        }}
      >
        {deletingContact
          ? `${i18n.t("contacts.confirmationModal.deleteMessage")}`
          : actionType === "export" && selectedContacts.length > 0
          ? selectedContacts.length === contacts.length
            ? "¿Está seguro que desea exportar todos los contactos?"
            : `¿Está seguro que desea exportar ${selectedContacts.length} contacto${selectedContacts.length > 1 ? 's' : ''}?`
          : actionType === "import" && contactCount > 0
          ? i18n.t("contacts.confirmationModal.importAgendaMessage").replace('{count}', contactCount)
          : selectedContacts.length > 0
          ? selectedContacts.length === contacts.length
            ? `${i18n.t("contacts.confirmationModal.deleteAllMessage")}`
            : `¿Seguro que desea eliminar ${selectedContacts.length} contacto${selectedContacts.length > 1 ? 's' : ''}? Se perderán todos los tickets relacionados.`
          : `${i18n.t("contacts.confirmationModal.importMessage")}`}
      </ConfirmationModal>
      <MainHeader>
        <Title>{i18n.t("contacts.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            color="primary"
            disabled={true}
            onClick={handleCheckAgenda}
            title="Función temporalmente deshabilitada - En desarrollo"
          >
            {i18n.t("contacts.buttons.import")}
          </Button>
                    <Button
            variant="contained"
            color="primary"
            onClick={() => {
              fileUploadRef.current.value = null;
              fileUploadRef.current.click();
            }}
      >
        {i18n.t("contacts.buttons.importSheet")}
      </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenContactModal}
          >
            {i18n.t("contacts.buttons.add")}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            disabled={selectedContacts.length === 0}
            onClick={() => {
              setActionType("delete");
              setConfirmOpen(true);
            }}
          >
            {i18n.t("contacts.buttons.delete")}
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (selectedContacts.length === 0) {
                toast.error(i18n.t("contacts.messages.selectToExport"));
                return;
              }
              setActionType("export");
              setConfirmOpen(true);
            }}
          >
            {i18n.t("contacts.buttons.export")}
          </Button>
          <IconButton
            color="primary"
            onClick={handleDownloadTemplate}
            title={i18n.t("contacts.buttons.downloadTemplate")}
            style={{ marginLeft: '8px' }}
          >
            <GetAppIcon />
          </IconButton>

        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <>
          <input
              style={{ display: "none" }}
              id="upload"
              name="file"
              type="file"
              accept=".xls,.xlsx"
              onChange={() => {
                setConfirmOpen(true);
              }}
              ref={fileUploadRef}
          />
        </>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  indeterminate={selectedContacts.length > 0 && selectedContacts.length < contacts.length}
                />
              </TableCell>
              <TableCell>PERFIL</TableCell>
              <TableCell>{i18n.t("contacts.table.name")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center">
              {i18n.t("contacts.table.lastInteraction")}
              </TableCell>
			  <TableCell align="center">{i18n.t("contacts.table.status")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {/* ✅ FILTRO: Excluir grupos de WhatsApp (con sufijo @g.us) */}
              {contacts
                .filter(contact => !contact.number.includes('@g.us'))
                .map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell style={{ paddingRight: 0 }}>
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                    />
                  </TableCell>
                  <TableCell style={{ paddingRight: 0 }}>
                    { <Avatar
                      style={{ backgroundColor: generateColor(contact?.number), fontWeight: "bold", color: "white" }}
                      src={contact.profilePicUrl}>
                      {getInitials(contact?.name)}
                    </Avatar>}
                  </TableCell>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell align="center">{contact.number}</TableCell>
                  <TableCell align="center">{contact.email}</TableCell>
                                    <TableCell align="center">
                                        {getDateLastMessage(contact)}
                                    </TableCell>
                                    <TableCell align="center">
                                        {contact.active ? (
                                            <CheckCircleIcon
                                                style={{ color: "green" }}
                                                fontSize="small"
                                            />
                                        ) : (
                                            <CancelIcon
                                                style={{ color: "red" }}
                                                fontSize="small"
                                            />
                                        )}
                                    </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setContactTicket(contact);
                        setNewTicketModalOpen(true);
                      }}
                    >
                      <WhatsAppIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => hadleEditContact(contact.id)}
                    >
                      <EditIcon />
                    </IconButton>
                    <Can
                      role={user.profile}
                      perform="contacts-page:deleteContact"
                      yes={() => (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setConfirmOpen(true);
                            setDeletingContact(contact);
                          }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton avatar columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Contacts;
