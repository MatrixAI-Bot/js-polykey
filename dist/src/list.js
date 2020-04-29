"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
// const colors = require('colors');
const values_1 = require("./values");
// export function to list coffee
const list = function () {
    console.log('COFFEE MENU');
    console.log('------------------');
    // list on separate lines
    values_1.types.forEach((type) => {
        console.log('%s %s', chalk_1.default.bold(type.name), chalk_1.default.grey('/ ' + type.price));
    });
};
exports.list = list;
//# sourceMappingURL=list.js.map