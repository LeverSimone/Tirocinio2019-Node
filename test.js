const engine = require('conweb-engine');


// I added an example HTML in the examples folder
var request = {
  url: "http://localhost:8080/examples/example.html",
  component: "list",  
  query: { 
    intent : "list_resources",
    resource : {
      name : "movies",
      selector : "ul",
      attributes : [{
        name : "title",
        selector : "h1"
      },{
        name : "stars",
        selector : "[bot-attribute=stars]"
      },{
        name : "plot",
        selector : "[bot-attribute=plot]"
      }]
    }
  }
};


try {
  engine.processIntent(request).then(res => console.log(res));
} catch (err) {
  console.log(err);
}