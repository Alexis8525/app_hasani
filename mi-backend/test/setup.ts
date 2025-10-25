// test/setup.ts
// Silenciar console.log durante los tests
const originalConsoleLog = console.log;
console.log = jest.fn();

// Opcional: mantener console.error visible para ver errores reales
// console.error = jest.fn();