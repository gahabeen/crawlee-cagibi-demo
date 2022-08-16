const { make, write, read, stitch, report, Context } = await import('cagibi');

const patches = [];

const person = make({
  name: 'Joe',
  age: 30,
  friends: [],
  details: {},
});

console.log(
  Context.getReferences(person)
);

patches.push(person);

patches.push(
  make({ age: 31 }, person)
)

patches.push(
  make({ birthdayMonth: 1 }, person.details)
)

// patches.push(
//   make({ friends: ['Dan'] }, person)
// )

const dan = make({ name: 'Dan' });

patches.push(
  make(dan, person.friends),
  make({ name: 'Joe' }, person.friends),
)

patches.push(
  make({ name: 'Danish', age: 32 }, dan)
)

console.log(patches
    .map(patch => write(patch))
    .map(patch => read(patch))
    );

console.log(
  stitch(...patches)
);

// console.log(
//   report(...patches)
// );