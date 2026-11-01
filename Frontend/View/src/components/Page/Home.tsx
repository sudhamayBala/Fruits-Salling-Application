
import { Link } from 'react-router-dom';
import fruitBasket from '../../assets/Overflowing Tropical Fruit Basket.png';
import '../../styles/page/Home.css';

function Home() {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <p className="home-hero-eyebrow">
          Fresh produce. Global reach.
        </p>

        <h1>Fruit from our farms to the world.</h1>

        <p className="home-hero-description">
          Discover quality fruits and flexible export solutions from INDKAN
          World Wide Exim Pvt. Ltd.
        </p>

        <div className="home-hero-actions">
          <Link
            className="hero-button hero-button-primary"
            to="/products"
          >
            Explore products
          </Link>

          <Link
            className="hero-button hero-button-secondary"
            to="/contact"
          >
            Contact our team
          </Link>
        </div>
      </div>

      <div className="home-hero-art">
        <img
          src={fruitBasket}
          alt="Basket filled with fresh fruits"
          className="fruit-basket-image"
        />
      </div>
    </section>
  );
}

export default Home;
