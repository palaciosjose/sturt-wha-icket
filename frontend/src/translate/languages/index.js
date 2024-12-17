import { messages as spanishMessages } from "./es";
import { messages as portugueseMessages } from "./pt";
import { messages as englishMessages } from "./en";

const messages = {
	...spanishMessages,
	...portugueseMessages,
	...englishMessages,
};

export { messages };
