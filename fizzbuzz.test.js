const fizzbuzz = require('./fizzbuzz');

test('Devuelve el numero si no es divisible por 3 or 5', () => {
    expect(fizzbuzz(1)).toBe(1);
    expect(fizzbuzz(2)).toBe(2);
    expect(fizzbuzz(4)).toBe(4);
});
