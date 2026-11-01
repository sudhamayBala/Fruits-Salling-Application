import { Link } from "react-router-dom";
import fruitBasket from "../../assets/Overflowing Tropical Fruit Basket.png";
import "../../styles/page/About.css";

const companyValues = [
  {
    number: "01",
    title: "Quality comes first",
    description:
      "We focus on carefully selected produce and clear product information, so customers can choose with confidence.",
  },
  {
    number: "02",
    title: "A thoughtful journey",
    description:
      "From product preparation to packaging and delivery, each step matters in bringing fruit to its destination in good condition.",
  },
  {
    number: "03",
    title: "Partnership that works",
    description:
      "We bring customers, dealers, and distributors together around dependable communication and practical supply solutions.",
  },
];

function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="about-eyebrow">A fresher way to connect</p>
          <h1>Good fruit. Thoughtful sourcing. A world of possibility.</h1>
          <p>
            INDKAN World Wide Exim Pvt. Ltd. connects quality fruit with the
            people and businesses looking for it, bringing product, preparation,
            and export support together in one place.
          </p>
          <div className="about-actions">
            <Link className="about-button about-button-primary" to="/products">
              Explore our products
            </Link>
            <Link className="about-button about-button-secondary" to="/contact">
              Talk to our team
            </Link>
          </div>
        </div>
        <div className="about-hero-image-wrap">
          <img
            className="about-hero-image"
            src={fruitBasket}
            alt="A colorful basket filled with fresh fruit"
          />
          <div className="about-image-note">
            <span aria-hidden="true">✦</span>
            <span>From fresh produce to global connections</span>
          </div>
        </div>
      </section>

      <section className="about-intro" aria-labelledby="about-story-title">
        <div className="about-section-label">
          <span>Our story</span>
          <span className="about-label-line" aria-hidden="true" />
        </div>
        <div className="about-intro-copy">
          <h2 id="about-story-title">
            Making fresh produce easier to discover and source.
          </h2>
          <p>
            Fruit is at its best when care goes into every part of its journey.
            Our work brings together product selection, packaging, dealer
            relationships, and export coordination to help make that journey
            clearer for customers and partners.
          </p>
          <p>
            Whether you are browsing our range or planning a supply enquiry, we
            aim to make the next step straightforward—with useful information,
            responsive communication, and a focus on the product.
          </p>
        </div>
      </section>

      <section className="about-values" aria-labelledby="about-values-title">
        <div className="about-values-heading">
          <p className="about-eyebrow">What guides us</p>
          <h2 id="about-values-title">A better fruit journey, at every step.</h2>
          <p>
            The details matter—from choosing the right product to getting it
            ready for the people who will enjoy it.
          </p>
        </div>
        <div className="about-value-grid">
          {companyValues.map((value) => (
            <article className="about-value-card" key={value.number}>
              <span className="about-value-number">{value.number}</span>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-journey" aria-labelledby="about-journey-title">
        <div className="about-journey-copy">
          <p className="about-eyebrow">From product to destination</p>
          <h2 id="about-journey-title">One connected experience.</h2>
          <p>
            Explore products, see how packaging is progressing, learn about our
            distribution network, and follow export updates. We bring these
            details together to help customers and partners stay informed.
          </p>
        </div>
        <div className="about-journey-links">
          <Link to="/gallery"><span>01</span> Browse the gallery</Link>
          <Link to="/packaging"><span>02</span> View packaging updates</Link>
          <Link to="/distributor"><span>03</span> Meet our distributors</Link>
          <Link to="/status"><span>04</span> Track shipment status</Link>
        </div>
      </section>

      <section className="about-cta">
        <div>
          <p className="about-eyebrow">Let’s grow together</p>
          <h2>Looking for a fruit supply partner?</h2>
          <p>Tell us what you are looking for and let’s start a conversation.</p>
        </div>
        <Link className="about-button about-button-light" to="/contact">
          Contact INDKAN
        </Link>
      </section>
    </main>
  );
}

export default About;
