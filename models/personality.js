// ability_6d is an array which contains the results of the 6D test
// Proper > Future > Potential

export const decisionTree = async (ability_6d) => {
    try {
        personality = []
        ability_ratings = []
        for (let i = 0; i < 6; i++) {
            if (ability_6d[i] > 3) {ability_ratings[i] = true;} 
            else {ability_ratings[i] = false;}
        }
        switch(ability_ratings) {
            // End columns 1-4
            case [true, true, true, true, true, true]:
            case [true, true, true, false, true, true]:
            case [true, true, true, true, false, true]:
            case [true, true, true, false, false, true]:
                personality.push("Analytical Thinkers");
                break;
            case [true, true, true, true, true, false]:
            case [true, true, true, false, true, false]:
            case [true, true, true, true, false, false]:
            case [true, true, true, false, false, false]:
                personality.push("Future Analytical Thinkers");
                break;
            case [true, true, false, true, true, true]:
            case [true, true, false, true, true, false]:
            case [true, true, false, false, true, true]:
            case [true, true, false, false, true, false]:
                personality.push("Logical Communicators");
                break;
            case [true, true, false, true, false, true]:
            case [true, true, false, false, false, true]:
                personality.push("Future Analytical Thinkers");
                break;
            case [true, true, false, true, false, false]:
            case [true, true, false, false, false, false]:
                personality.push("Potential Analytical Thinkers");
                break;
            // End columns 5-8;
            case [true, false, true, true, true, true]:
            case [true, false, true, true, true, false]:
            case [true, false, true, false, true, true]:
            case [true, false, true, false, true, false]:
                personality.push("Future Logical Communicators"); //Business
                personality.push("Future Balanced Scientists"); //Science
                break;
            case [true, false, true, true, false, true]:
            case [true, false, true, false, false, true]:
                personality.push("Future Analytical Thinkers");
                break;
            case [true, false, true, true, false, false]:
            case [true, false, true, false, false, false]:
                personality.push("Future Logical Communicators"); //Business
                personality.push("Future Balanced Scientists"); //Science
                break;
        }
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Code 1 means exit with failure, 0 means success
    }
}