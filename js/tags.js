/**
    * Define custom HTML tags.
    *
    * @file   tags.js.
    * @author Jonathan Delgado.
 */
/*======================= Helper =======================*/
/**
    * Gets camelcase version of string, i.e. Complex Analysis.
    * complexAnalysis.
    * @param {arg1 type} arg1 name - arg1 description.
    */
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
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
customElements.define('github-link', class ContactMe extends HTMLElement {
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
        // Div and span container
        var container = document.createElement('div');
        container.className = 'col-4';
        this.parentElement.appendChild(container);
        var span = document.createElement('span');
        span.className = 'image fit';
        container.appendChild(span);

        var href = this.getAttribute('img-link');
        if (href != null) {
            var link = document.createElement('a');
            link.href = href
            link.target = '_blank';
            span.appendChild(link);
        }

        var img = document.createElement('img');
        img.src = this.getAttribute('img-src');
        if (href != null) {
            link.appendChild(img)
        } else {
            span.appendChild(img)
        }

        var captionText = this.getAttribute('img-caption');
        if (captionText != null) {
            // Caption exists
            var caption = document.createElement('span');
            caption.textContent = captionText;
            caption.className = 'col-12 caption';
            span.appendChild(caption)
        }

        // Delete own tag since template CSS depends on immediate child
        this.parentElement.removeChild(this);
    }
});



/**
    * Initializes reveal buttons.
    */
function initRevealButtons() {
    var buttons = $('reveal-button');

    for (var button of buttons) {
        // Example label: Curriculum Vitae
        label = button.innerHTML.trim()
        // Example name: cv
        name = $(button).attr('name');
        if (name == 'undefined') {
            // Get default name if attribute isn't provided
            name = label
        }
        // Link to the pdf
        pdfLink = $(button).attr('pdf-link')
        // Example button container anchor: realAnalysis
        containerAnchor = camelize(name)
        // Example button id: realAnalysisButton
        id = containerAnchor + 'Button'
        // The button functionality
        onclickCommand = `toggleRevealButtonChosen("#${containerAnchor}");`
        // Make the button
        button.innerHTML = `
        <a id='${id}' onclick='${onclickCommand}'
        class='button large'>
            ${label}
        </a>
        `
        /*-- PDF container --*/
        initPDFContainer(containerAnchor, pdfLink)
    }
}


/**
    * Initializes the PDF container for the id associated to
    * given reveal button.
    * @param {str} containerAnchor - the anchor to use for linking from another 
    * button.
    * @param {str} pdfLink - the link to the pdf to show.
    */
function initPDFContainer(containerAnchor, pdfLink) {
    container = $('#pdfContainer')[0];
    container.innerHTML += `
        <div id='${containerAnchor}' style='display:none;'>
            <a name='${containerAnchor}'></a>
            <iframe src='${pdfLink}' width='100%' height='800'></iframe>
        </div>
    `
}



/*======================= Functionality =======================*/


/**
    * Highlights contact me information.
    */
function contactHighlight() {
    // Do nothing if this is not a contact hash
    if (location.hash !== '#contact') { return; }

    // Go to hash
    $(location.hash).slideDown(animStyle);
    // Highlight the contact info
    $('mark#contact-mark').animate({
        backgroundColor: '#6CA3D8',
    }, 1500)
    .delay(500)
    .animate({
        backgroundColor: 'transparent',
    }, 1500);
}


/*======================= Entry =======================*/
$(function() {
    $(window).bind(
        'hashchange',
        contactHighlight()
    );
});

initRevealButtons();