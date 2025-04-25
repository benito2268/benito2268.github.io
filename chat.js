console.log("hello world");

let messages = [
    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "test",
        "content" : "a test post :)",
    },

    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "another test",
        "content" : "haha haha :)",
    },

    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "test",
        "content" : "a test post :)",
    },

    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "another test",
        "content" : "haha haha :)",
    },

    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "test",
        "content" : "a test post :)",
    },

    {
        "author" : "ben",
        "datetime" : 1743217391,
        "title" : "another test",
        "content" : "haha haha :) this is some more content to try to make the line super long and see when happens",
    },
]

function makePost() {

}

function getPost(message) {
    const card = document.createElement("div");
    card.classList.add("card");

    const title = document.createElement("h2");
    title.classList.add("card-content");
    title.classList.add("card-title");
    title.innerText = message.title;
    card.appendChild(title);

    const info = document.createElement("h4");
    info.classList.add("card-content");
    info.classList.add("card-info");
    const datestr = new Date(message.datetime * 1000).toLocaleString();
    info.innerText = `${message.author} - ${datestr}`
    card.appendChild(info);

    const content = document.createElement("p")
    content.classList.add("card-content");
    content.classList.add("card-text"); 
    content.innerText = message.content;
    card.appendChild(content);

    return card;
}

function signin() {
    console.log("signin");
}

function register() {
    console.log("register");
}

messages.forEach(i => {
    const msg = getPost(i);
    document.getElementById("cardContainer").appendChild(msg);
});