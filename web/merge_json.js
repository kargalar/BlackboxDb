const fs = require('fs');
const text = fs.readFileSync('messages/en.json', 'utf8');
let count = 0;
let newText = text.replace(/  "Explore": \{/g, () => {
    count++;
    return '  "Explore_' + count + '": {';
});
fs.writeFileSync('messages/en_temp.json', newText);
console.log('Replaced ' + count + ' occurrences.');

// Now let's parse the new JSON and see
const data = require('./messages/en_temp.json');
const explore1 = data['Explore_1'];
const explore2 = data['Explore_2'];
const explore3 = data['Explore_3'];

// Merge them
// Wait, Explore_1 has a string "title". Explore_2 has an object "title".
// We will rename the top-level title in Explore_1 to "mainTitle", and keep the object in "title".

const mergedExplore = {
    ...explore1,
    ...explore2,
    ...explore3,
};

// Handle title conflict
if (typeof explore1.title === 'string' && typeof explore2.title === 'object') {
    mergedExplore.mainTitle = explore1.title;
    mergedExplore.title = explore2.title;
}

// Check if any other keys are duplicated?
// Let's just output the keys in the merged Explore.
delete data['Explore_1'];
delete data['Explore_2'];
delete data['Explore_3'];

data['Explore'] = mergedExplore;

fs.writeFileSync('messages/en.json', JSON.stringify(data, null, 2));
console.log('Merged successfully.');
