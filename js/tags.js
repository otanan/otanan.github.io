/**
    * Define custom HTML tags.
    *
    * @file   tags.js.
    * @author Jonathan Delgado.
 */
 /*======================= Fields =======================*/
const ANIM_STYLE = 'slow';
/*======================= Helper =======================*/
/**
 * Clears the hash from the URL.
 */
function clearHash() { history.replaceState(null, null, ' '); }
/**
    * Updates the location URL hash.
    * @param {string} hash - the new hash to use.
    */
function updateHash(hash) {
    if (hash[0] !== '#') { hash = '#' + hash; }
    location.hash = hash;
}
/**
    * Gets the location.hash string.
    */
function getHash() { return location.hash.replace('#', ''); }

/**
    * Gets camelcase version of a string, i.e. Complex Analysis returns
    * complexAnalysis.
    * Credit: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case.
    * @param {string} str - the string to make camelcase.
    */
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}


/**
    * Highlights contact me information.
    */
function contactHighlight() {
    // Go to hash
    $(location.hash).slideDown(ANIM_STYLE);
    // Highlight the contact info
    $('mark#contact-mark').animate({
        backgroundColor: '#6CA3D8',
    }, 1500)
    .delay(500)
    .animate({
        backgroundColor: 'transparent',
    }, 1500);
}


/*======================= Tag Initialization =======================*/
/**
    * Defines the contact-me tag.
    */
customElements.define('contact-me', class ContactMe extends HTMLElement {
    constructor() {
        super();

        var link = document.createElement('a');
        link.href = 'about-me#contact';
        link.style.textDecoration = 'none';
        this.appendChild(link);

        var span = document.createElement('span');
        span.className = 'icon solid fa-envelope';
        span.textContent = ' contact me';
        link.appendChild(span);

        // Delete own tag since template CSS depends on immediate child
        // this.parentElement.removeChild(this);
    }
});


/**
    * Defines the github-link tag
    */
customElements.define('github-link', class GitHubLink extends HTMLElement {
    constructor() {
        super();

        var link = document.createElement('a');
        link.href = 'https://github.com/otanan/';
        var repo = this.getAttribute('repo-link');
        if (repo != null) { link.href += repo; }
        link.style.textDecoration = 'none';
        link.target = '_blank';
        this.appendChild(link);

        var span = document.createElement('span');
        span.className = 'icon brands fa-github';
        span.textContent = ' GitHub';
        link.appendChild(span);
    }
});


/**
    * Defines the Grid Image tag which places images in a grid, allows captions 
    * and links from clicking the image.
    */
customElements.define('grid-image', class GridImage extends HTMLElement {
    constructor() {
        super();

        var container = this.makeContainer();

        var href = this.getAttribute('img-link');
        if (href != null) {
            var link = document.createElement('a');
            link.href = href;
            link.target = '_blank';
            container.appendChild(link);
        }

        var img = document.createElement('img');
        img.src = this.getAttribute('img-src');
        if (href != null) { link.appendChild(img); }
        else { container.appendChild(img); }

        var captionText = this.getAttribute('img-caption');
        if (captionText != null) {
            // Caption exists
            var caption = document.createElement('caption');
            caption.textContent = captionText;
            caption.className = 'col-12';
            container.appendChild(caption)
        }

        // Delete own tag since template CSS depends on immediate child
        this.parentElement.removeChild(this);
    }
    /**
        * Make the container with special classes required for proper styling 
        * holding the image.
        */
    makeContainer() {
        // Div and span container
        var container = document.createElement('div');
        // Make use of template classes
        container.className = 'col-4';
        this.parentElement.appendChild(container);
        var span = document.createElement('span');
        span.className = 'image fit';
        container.appendChild(span);

        return span;
    }
});


/**
    * Defines the reveal button with selected state.
    */
class RevealButton extends HTMLElement {
    // PDF container tied to all buttons
    static pdfContainer = null;
    static active = null;
    // Dictionary of buttons by their pdf anchors.
    static buttons = {};

    constructor() {
        super();
        /*-- Tag information --*/
        // Example label: Curriculum Vitae
        var label = this.getAttribute('button-label');
        // Button name, for anchoring and changing hash
        // Example name: cv, realAnalysis
        this.pdfAnchor = this.getAttribute('button-name');
        this.pdfAnchor = (this.pdfAnchor == undefined) ? camelize(label) : camelize(this.pdfAnchor);
        // Link to the pdf to reveal
        var pdfLink = this.getAttribute('pdf-link');

        /*-- Button creation --*/
        this.link = document.createElement('a');
        this.link.innerText = label;
        this.link.className = 'unselectable large button';
        this.appendChild(this.link);

        this.initPDFContainer(pdfLink);

        // Bind click event
        this.addEventListener('click', this.toggle);
        // Save button
        RevealButton.buttons[this.pdfAnchor] = this;
    }
    /**
        * Creates pdf view in pdf container.
        */
    initPDFContainer(pdfLink) {
        if (RevealButton.pdfContainer == null) {
            // Find the first container
            RevealButton.pdfContainer = $('#pdfContainer')[0];
        }
        this.pdfdiv = document.createElement('div');
        // Start hidden
        this.pdfdiv.style.display = 'none';
        RevealButton.pdfContainer.appendChild(this.pdfdiv);

        // Linking anchor, offset in CSS
        var anchor = document.createElement('a');
        anchor.className = 'anchor';
        anchor.id = this.pdfAnchor;
        this.pdfdiv.appendChild(anchor);

        var pdfFrame = document.createElement('iframe');
        pdfFrame.src = pdfLink;
        pdfFrame.width = '100%';
        pdfFrame.height = '800';
        this.pdfdiv.appendChild(pdfFrame);
    }
    /**
        * Handles toggle logic by activating and deactivating corresponding 
        * buttons.
        */
    toggle() {
        if (RevealButton.active == null) {
            // No button is active, this one will be
            this.select();
        } else if (RevealButton.active == this) { 
            // This is active, none will be
            this.deselect();
        } else {
            // Replace old button with new
            RevealButton.active.deselect();
            this.select();
        }
    }


    select() {
        RevealButton.active = this;
        updateHash(this.pdfAnchor);
        $(this.link).addClass('selected');
        // Show pdf
        $(this.pdfdiv).slideDown(ANIM_STYLE);
    }


    deselect() {
        RevealButton.active = null;
        clearHash();
        $(this.link).removeClass('selected');
        // Hide pdf
        $(this.pdfdiv).slideUp(ANIM_STYLE);
    }
}
customElements.define('reveal-button', RevealButton);


/*======================= Entry =======================*/
currentHash = getHash();
// Do nothing on empty hash
if (currentHash === '') { }
else if (currentHash === 'contact') { contactHighlight(); }
else {
    // Check hash for a button to start as active
    var button = RevealButton.buttons[currentHash];
    // The button exists, select it
    if (button != undefined) { button.select(); }
}