let link_no = Math.floor(Math.random() * 15); // there are currently 14 links
let style = document.createElement("style");
console.log(link_no);
style.innerHTML = `
     a:hover:after {
         content: url("images/link/link_${link_no}.png");
         display: block;
     }
 `
document.body.appendChild(style);

function get_link() {
    
}
