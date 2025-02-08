// create a div for the fish animation
fish_anim = document.createElement("div");
fish_anim.id = "fish_anim";
document.appendChild(fish_anim);
animate_fish();

//render the fishes :)
function animate_fish() {
    let elem = document.getElementById("fish_anim");
    let pos = 0;
    clearInterval(id);
    id = setInterval(frame, 10);
    function frame() {
        if (pos == 350) {
            clearInterval(id);
        }
        else {
            pos++;
            elem.style.top = pos + 'px';
            elem.style.left = pos = 'px';
        }
    }
}
