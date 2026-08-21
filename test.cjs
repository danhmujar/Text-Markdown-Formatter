const { marked } = require('marked');
marked.setOptions({ breaks: true });
console.log(marked.parse("Hello<br>world"));
console.log(marked.parse("Hello\nworld"));
