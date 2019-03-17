const engine = require('conweb-engine');


// I added an example HTML in the examples folder
var request = {
  url: "http://localhost:3000/examples/movies.html",
  component: "list",
  query: {
    intent: "list_resources",
    resource: {
      name: "movies",
      selector: "ul",
      param_attr: {
        name: null,
        selector: null
      },
      operation: null,
      attributes: [{
        name: "title",
        selector: "h1"
      }, {
        name: "stars",
        selector: "[bot-attribute=stars]"
      }, {
        name: "plot",
        selector: "[bot-attribute=plot]"
      }]
    }
  }
};


try {
  engine.processIntent(request).then(res => console.log(res));
} catch (err) {
  console.log(err);
}