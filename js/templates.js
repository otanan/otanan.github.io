/**
    * Templates for cross-page features, such as website menu and footer.
    *
    * @file   templates.js.
    * @author Jonathan Delgado.
 */
/*======================= Functions =======================*/
/**
    * Gets the file's last modified date in a pretty format..
    */
function getModifiedDateString() {
    var date = new Date(document.lastModified);
    var formatting= { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', formatting);
}


/*======================= Navigation Menu =======================*/


var nav_template = `
<nav id='menu'>
    <div class='inner'>
        <h2>Menu</h2>
        <ul class="links">
            <li><a href="/">Home</a></li>

            <li><a href="about-me">About Me</a></li>

            <li><a href="stochastic-thermodynamics">Stochastic Thermodynamics</a></li>

            <li><a href="quantum-information-theory">Quantum Information Theory</a></li>

            <!-- <li><a href="publications">Publications</a></li> -->

            <li><a href="notes">Notes</a></li>

            <li><a href="coding-projects">Coding Projects</a></li>
        </ul>
    </div>
</nav>
`


/*======================= Footer =======================*/

var pages = `
<section>
    <h3>Pages</h3>
    <ul class="contact">

        <a href="about-me">
            <li class="icon solid fa-envelope">
                Email
            </li>
        </a>

        <a href='about-me#cv'>
            <li class="icon solid fa-file-code">
                Curriculum Vitae
            </li>
        </a>

        <a href="https://github.com/otanan" target='_blank'>
            <li class="icon brands fa-github">
                GitHub
            </li>
        </a>

        <a href="https://www.linkedin.com/in/jonathandelgado0327/" target='_blank'>
            <li class="icon brands fa-linkedin">
                LinkedIn
            </li>
        </a>

    </ul>
</section>
`


// var mailing_address = `
// <section>
//     <h3>Mailing Address</h3>
//     <p>Jonathan Delgado<br />
//     1234 Fictional Road<br />
//     Suite 5432<br />
//     Nashville, TN 00000<br />
//     USA</p>
// </section>
// `

// Temporary empty section to flush pages to right until office address is
    // available
var mailing_address = '<section></section>'

// Temporarily place pages to right of mailing_address until office address 
    // is ready
var footer_template = `
<section id="footer">
    <div class="inner">
        <section class="about">
            <!-- <em class='unselectable' style='color:gray;'>Last modified: ${getModifiedDateString()}</em> -->
            <!-- <h3>Acknowledgments</h3> -->
            
            <p>
                <!-- Acknowledgments here -->

            </p>
            
            <ul class="actions">
                <!-- <li><a href="#" class="button">Learn More</a></li> -->
            </ul>
        </section>
        `  + mailing_address + pages + `
    </div>
</section>
`


/*---------------------- Insert templates ----------------------*/

// Insert the menu
$('#menu').replaceWith(nav_template)
// Insert the footer
$('#footer').replaceWith(footer_template)