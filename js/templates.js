/*---------------------- Nav menu ----------------------*/

var nav_template = `
<nav id='menu'>
    <div class='inner'>
        <h2>Menu</h2>
        <ul class="links">
            <li><a href="index.html">Home</a></li>
            <li><a href="stochthermo.html">Stochastic Thermodynamics</a></li>
            <li><a href="qinfo.html">Quantum Information Theory</a></li>
            <li><a href="contact.html">Contact</a></li>
        </ul>
    </div>
</nav>
`


/*---------------------- Footer ----------------------*/


var mailing_address = `
<section>
    <h3>Mailing Address</h3>
    <p>Jonathan Delgado<br />
    1234 Fictional Road<br />
    Suite 5432<br />
    Nashville, TN 00000<br />
    USA</p>
</section>
`

var pages = `
<section>
    <h3>Pages</h3>
    <ul class="contact">

        <a href='https://www.overleaf.com/read/fysdgddkgprx' target='_blank'>
            <li class="icon solid fa-file-code">
                Curriculum Vitae
            </li>
        </a>
        
        <a href="contact.html">
            <li class="icon solid fa-envelope">
                Email
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

var footer_template = `
<section id="footer">
    <div class="inner">
        <section class="about">
            <h3>Proin sed ultricies</h3>
            <p>Praesent egestas quam at lorem imperdiet lobortis. Mauris condimentum et euismod ipsum, at ullamcorper libero dolor auctor sit amet. Proin vulputate.</p>
            <ul class="actions">
                <li><a href="#" class="button">Learn More</a></li>
            </ul>
        </section>
        ` + pages + mailing_address + `
    </div>
    <div class="copyright">
        <p>Copyright &copy; Untitled Corp. All rights reserved.</p>
    </div>
</section>
`


/*---------------------- Insert code ----------------------*/

// Insert the menu
$('#menu').replaceWith(nav_template)
// Insert the footer
$('#footer').replaceWith(footer_template)