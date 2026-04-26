const fs = require('fs');
const path = require('path');

const appDataPath = path.join(process.env.APPDATA, 'com.botc.grimoire', 'all_character.json');

try {
    if (fs.existsSync(appDataPath)) {
        const data = JSON.parse(fs.readFileSync(appDataPath, 'utf8'));
        let modified = false;
        data.forEach(char => {
            if (!char.conflicts) {
                char.conflicts = [];
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(appDataPath, JSON.stringify(data, null, 2), 'utf8');
            console.log('Successfully updated AppData all_character.json with conflicts: []');
        } else {
            console.log('AppData all_character.json already has conflicts.');
        }
    } else {
        console.log('AppData all_character.json does not exist yet.');
    }
} catch (error) {
    console.error('Error:', error);
}
