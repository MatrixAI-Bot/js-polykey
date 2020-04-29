"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// coffee types
const types = [
    { name: 'Espresso', price: '$5.99' },
    { name: 'Latte', price: '$4.50' },
    { name: 'Cappuchino', price: '$3.99' },
    { name: 'Americano', price: '$2.50' },
    { name: 'Macchiato', price: '$3.50' },
];
exports.types = types;
const typesPlain = exports.types.map(function (o) {
    return o.name + ' (' + o.price + ')'; // convert to one line
});
// sugar levels
const sugar = [
    { name: 'Low', spoons: '1' },
    { name: 'Medium', spoons: '2' },
    { name: 'High', spoons: '3' },
    { name: 'Very High', spoons: '4' },
];
const sugarPlain = sugar.map(function (o) {
    return o.name + ' (' + o.spoons + ' spoons)'; // convert to one line
});
// served in
const servedIn = [
    "Mug",
    "Cup",
    "Takeway package"
];
//# sourceMappingURL=values.js.map