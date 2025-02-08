// create a div for the fish animation
let fish_anim = document.createElement("div");
fish_anim.id = "fish_anim";
console.log("hello world");

// add the fish
for (let i = 0; i < 5; i++) {
    let fish = document.createElement("img");
    fish.id = `fish_img${i}`;
    fish.src = `images/fish/fish_${i + 1}.png`;
    fish_anim.appendChild(fish);
}

document.body.appendChild(fish_anim);

const page_width = window.innerWidth;
const page_height = window.innerHeight - 100;

class Fish {
    constructor(index, side) {
        this.img = document.getElementById(`fish_img${index}`);
        if (side === "left") {
            this.posX = 0;
        }
        else {
            this.posX = page_width;
        }
        
        this.id = `fish_img${index}`;
        this.index = index;
        this.side = side;
        this.speed = Math.random();
        this.posY = Math.random() * (page_height + 1);
        this.img.style.position = 'absolute'; // Ensure absolute positioning
        this.img.style.top = this.posY + 'px'; // Initial vertical position
        this.img.style.left = this.posX + 'px'; // Initial horizontal position
    }

    swim() {
        if (this.side === "left") {
            this.posX += this.speed;
        }
        else {
            this.posX -= this.speed;
        }
        this.img.style.left = this.posX + 'px';
    }
}

const fishes = [
    new Fish(0, "left"),
    new Fish(1, "left"),
    new Fish(2, "right"),
    new Fish(3, "left"),
    new Fish(4, "right"),
];

//render the fishes :)
function animate_fish(index) {
    let fish = fishes[index];

    console.log(fish);

    let id; // Declare id for setInterval
    clearInterval(id); // Clear previous intervals (if any)
    id = setInterval(frame, 10);
    
    function frame() {
        if ((fish.side === "left" && fish.posX >= page_width) || (fish.side === "right" && fish.posX <= -20)) { // Stop when fish moves off screen
            clearInterval(id);
            el = document.getElementById(fish.id);     
            el.remove();
        }
        else {
            fish.swim(); // Move fish
        }
    }
}

animate_fish(0);
animate_fish(1);
animate_fish(2);
animate_fish(3);
animate_fish(4);