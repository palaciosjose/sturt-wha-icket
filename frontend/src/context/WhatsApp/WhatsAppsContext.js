import React, { createContext } from "react";

import useWhatsApps from "../../hooks/useWhatsApps";

const WhatsAppsContext = createContext();

const WhatsAppsProvider = ({ children }) => {
	const { loading, whatsApps, refreshWhatsApps } = useWhatsApps();

	return (
		<WhatsAppsContext.Provider value={{ whatsApps, loading, refreshWhatsApps }}>
			{children}
		</WhatsAppsContext.Provider>
	);
};

export { WhatsAppsContext, WhatsAppsProvider };
