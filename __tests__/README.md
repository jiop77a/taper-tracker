# Taper Tracker Tests

This directory contains the test suite for the Taper Tracker application, organized by functionality.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run specific test categories
npm test algorithm/
npm test ui/
```

## Test Structure

### `algorithm/` - Core Algorithm Tests

Pure logic tests independent of UI implementation:

#### `taper-generation.test.ts` (20 tests)

- **Valid dosing scenarios**: Basic taper generation with valid parameters
- **Edge cases**: Minimum/maximum doses, cycle length limits
- **Duration constraints**: Short, long, and very long duration requirements
- **Step constraints**: Few steps and many steps scenarios
- **Cycle length constraints**: Short and long cycle requirements
- **Complex multi-constraint scenarios**: Multiple constraints combined

#### `constraint-handling.test.ts` (12 tests)

- **Dosing bounds validation**: Maximum dose limits, minimum reductions
- **Constraint violation handling**: Impossible constraints and error reporting
- **Silent failure prevention**: Ensures proper error messages
- **Constraint status reporting**: Violations, warnings, and respected constraints

#### `quality-analysis.test.ts` (15 tests)

- **Step size consistency**: Smoothness and variance analysis
- **Dose progression validation**: Monotonic decrease, no dose increases
- **Cycle length consistency**: Reasonable variation limits
- **Overall taper quality**: Duration, step balance, edge cases

### `ui/` - User Interface Tests

UI-specific validation and interaction tests:

#### `builder-validation.test.ts` (18 tests)

- **Basic input validation**: Empty fields, non-numeric inputs
- **Dosing bounds validation**: UI-level bounds checking
- **Dose relationship validation**: Current vs goal dose logic
- **Pill strength validation**: Optional field validation
- **Multiple validation errors**: Combined error scenarios
- **Edge cases**: Boundary values, whitespace handling

## Test Categories

### ✅ Dosing Bounds

- Maximum starting dose: 2.0 pills
- Minimum reduction: 0.25 pills
- Goal dose validation
- Dose relationship validation

### ✅ Error Handling

- Impossible cycle length constraints
- Conflicting step size constraints
- Helpful error messages and reasoning

### ✅ Valid Scenarios

- Standard dose ranges
- Boundary conditions
- Complete discontinuation (goal = 0)

### ✅ Edge Cases

- Very short cycle lengths (4+ days minimum)
- Large dose reductions
- Small valid reductions

### ✅ Silent Failure Prevention

- Ensures all failure cases provide error messages
- Tests various constraint combinations that might cause issues

## Adding New Tests

When adding new tests:

1. Follow the existing describe/test structure
2. Use descriptive test names
3. Test both success and failure cases
4. Include edge cases and boundary conditions
5. Ensure error messages are validated, not just error presence
