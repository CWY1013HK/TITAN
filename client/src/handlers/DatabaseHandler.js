import apiClient from '../utils/apiClient.js';

export default class DBTable {
    constructor(collection, ID, schema, columns = []) {
        this.collection = collection; // Uppercase name of the collection
        this.ID = ID; // Name of ID column
        this.schema = schema; // Object { Column: default value, including ID column }
        /* Sample schema
          const activitySchema = {
            Act_ID: "",
            CSSViewTransitionRule: "",
            Pointer: 0,
            Ending: 0,
            Questions: []
          };
        */
        this.column = columns; // Filter for columns to show; can be used as containers for additional parameters
    }

    handleRead = async (currentQuery, notif = true) => { // row
        try {
            // console.log(`${this.collection} Read: ${this.ID},`, currentQuery[this.ID]);

            const queryID = {
                collection: this.collection,
                ID: this.ID,
                rowID: currentQuery[this.ID] || ""
            };

            // Universal protocol
            const response = await apiClient.post(`api/database/read`, queryID);

            if (response.ok) {
                if (notif) alert(`The ${this.collection.toLowerCase()}'s profile has been read successfully!`);
                const correspondent = await response.json();
                // Split the booty!
                let container = {};
                for (const [key, value] of Object.entries(this.schema)) {
                    container[key] = correspondent[key];
                    // console.log(key, "=", container[key]);
                }
                // console.log(`${this.collection} Read: currentQuery,`, container);
                return container;
            } else {
                if (notif) alert(`There was an error reading the ${this.collection.toLowerCase()}'s profile. Please try again.`);
                return null;
            }
        } catch (error) {
            console.error("Network error:", error);
            if (notif) alert("Network error occurred. Please check your connection and try again.");
            return null;
        }
    };

    handleDelete = async (currentQuery, notif = true) => { // row
        try {
            // console.log(`${this.collection} Delete: ${this.ID},`, currentQuery[this.ID]);

            const queryID = {};
            queryID["collection"] = this.collection;
            queryID["ID"] = this.ID;
            queryID["rowID"] = currentQuery[this.ID];

            // Universal protocol
            const response = await apiClient.post(`api/database/delete`, queryID);

            if (response.ok) {
                if (notif) alert(`The ${this.collection.toLowerCase()}'s profile has been deleted successfully!`);
                return false;
            } else {
                if (notif) alert(`There was an error deleting the ${this.collection.toLowerCase()}'s profile. Please try again.`);
                return true;
            }
        } catch (error) {
            console.error("Network error:", error);
            if (notif) alert("Network error occurred. Please check your connection and try again.");
        }
    };

    handleWrite = async (currentQuery, notif = true) => { // row
        // console.log("USER Write:", currentQuery);
        try {
            const queryID = {
                collection: this.collection,
                ID: this.ID,
                row: currentQuery
            };

            // Universal protocol
            const response = await apiClient.post(`api/database/write`, queryID);

            if (response.ok) {
                if (notif) alert(`The ${this.collection.toLowerCase()}'s profile has been written successfully!`);
                // console.log(`${this.collection} Write: currentQuery,`, currentQuery);
                return false;
            } else {
                if (notif) alert(`There was an error writing the ${this.collection.toLowerCase()}'s profile. Please try again.`);
                return true;
            }
        } catch (error) {
            console.error("Network error:", error);
            if (notif) alert("Network error occurred. Please check your connection and try again.");
            return true;
        }
    };

    handleUpdate = async (currentQuery, updates, notif = true) => {
        // console.log(`${this.collection} Update:`, currentQuery, "with updates:", updates);
        try {
            // First get the current document
            const currentDoc = await this.handleRead(currentQuery, false);
            if (!currentDoc) {
                throw new Error(`Document not found for ${this.ID}: ${currentQuery[this.ID]}`);
            }

            // Merge the updates with the current document
            const updatedDoc = {
                ...currentDoc,
                ...updates
            };

            // Use handleWrite to save the merged document
            return await this.handleWrite(updatedDoc, notif);
        } catch (error) {
            console.error("Update error:", error);
            if (notif) alert(`There was an error updating the ${this.collection.toLowerCase()}'s profile. Please try again.`);
            return true;
        }
    };

    handleLogin = async (email, password) => {
        try {
            const response = await apiClient.post('api/auth/login', { email, password });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    isAuthenticated = () => {
        return !!localStorage.getItem('token');
    };

    getCurrentUser = () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    };
}