const test = require('unit.js')

const db = require('../src/database');

describe('GetTeamID tests', () =>
{
    it('strings in order', () =>
    {
        const result = db.GetTeamID(['a', 'b', 'c']);
        test.string(result).is('abc');
    });

    it('strings out of order', () =>
    {
        const result = db.GetTeamID(['b', 'b', 'd', 'a', 'cc', '0']);
        test.string(result).is('0abbccd');
    });

    it('users', () =>
    {
        const users = [
            { id: 'c', name: 'a' },
            { id: 'd', name: 'b' },
            { id: 'b', name: 'c' },
            { id: 'e', name: 'd' },
            { id: 'g', name: 'e' },
            { id: 'f', name: 'f' },
            { id: 'a', name: 'g' },
        ];
        const result = db.GetTeamID(users);
        test.string(result).is('abcdefg');
    });
});

describe('Add games', () =>
{
    it('Single', () =>
    {
        db.AddSingleGame(
            {id: 'TEST1000', name: 'Testicules'},
            {id: 'TEST1001', name: 'Hercules'});
    });
});
