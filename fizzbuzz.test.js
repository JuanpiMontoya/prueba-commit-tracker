const fizzbuzz = require('./fizzbuzz');

test('Devuelve el numero si no es divisible por 3 or 5', () => {
    expect(fizzbuzz(1)).toBe(1);
    expect(fizzbuzz(2)).toBe(2);
    expect(fizzbuzz(4)).toBe(4);
});

test('Devuelve "Fizz" si es divisible por 3', () => {
    expect(fizzbuzz(3)).toBe("Fizz");
    expect(fizzbuzz(6)).toBe("Fizz");
    expect(fizzbuzz(9)).toBe("Fizz");
});

test('Devuelve "Buzz" si es divisible por 5', () => {
    expect(fizzbuzz(5)).toBe("Buzz");
    expect(fizzbuzz(10)).toBe("Buzz");
});

test('Devuelve "FizzBuzz" si es divisible por 3 y 5', () => {
    expect(fizzbuzz(15)).toBe("FizzBuzz");
    expect(fizzbuzz(30)).toBe("FizzBuzz");
});
