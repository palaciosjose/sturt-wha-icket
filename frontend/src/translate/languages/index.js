import { messages as portugueseMessages } from "./pt";
import { messages as englishMessages } from "./en";
import { messages as spanishMessages } from "./es";

const messages = {
	...portugueseMessages,
	...englishMessages,
	...spanishMessages, // El español debe tener prioridad
};

export { messages };
