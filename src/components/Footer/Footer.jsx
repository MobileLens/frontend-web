import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBrands } from "../../api/brands";
import { getCatalogueFacets, searchCatalogue } from "../../api/smartphones";
import logo from "../../assets/brand/mobilelens-logo-horizontal.svg";
import logoInverse from "../../assets/brand/mobilelens-logo-horizontal-inverse.svg";
import { browseUrl } from "../../utils/catalogueFilter";
import Icon from "../Icon/Icon";
import ThemeSwitch from "../ThemeSwitch/ThemeSwitch";
import "./Footer.css";

const MAX_BRANDS = 6;


function countCameras(facets) {
  if (!facets) return null;
  return Object.values(facets.types || {}).reduce((sum, facet) => sum + facet.count, facets.front?.count || 0);
}

function Footer() {
  const [phones, setPhones] = useState(null);
  const [cameras, setCameras] = useState(null);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let ignore = false;

    // Only decoration: a failed request leaves its number out.
    searchCatalogue({ page: 1, limit: 1, sort: "name" }).then(
      (result) => { if (!ignore) setPhones(result.total); },
      () => {},
    );
    getCatalogueFacets().then(
      (facets) => { if (!ignore) setCameras(countCameras(facets)); },
      () => {},
    );
    getBrands().then(
      (list) => { if (!ignore) setBrands(list); },
      () => {},
    );

    return () => {
      ignore = true;
    };
  }, []);

  const stats = [
    [phones, "phones"],
    [cameras, "cameras"],
    [brands.length || null, "brands"],
  ].filter(([value]) => Number.isFinite(value)); // an odd answer leaves its number out instead of breaking the page

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-about">
          <img className="logo-on-light" src={logo} alt="MobileLens" width="138" height="28" />
          <img className="logo-on-dark" src={logoInverse} alt="MobileLens" width="138" height="28" />
          <p>A catalogue of smartphone cameras: specs, sample photos, comparisons and reviews.</p>

          {stats.length > 0 && (
            <dl className="site-footer-stats">
              {stats.map(([value, label]) => (
                <div key={label}>
                  <dd>{value.toLocaleString("en-US")}</dd>
                  <dt>{label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        <nav aria-label="Explore">
          <h2>Explore</h2>
          <ul>
            <li><Link to="/browse">Full catalogue</Link></li>
            <li><Link to="/browse?sort=trending">Most viewed</Link></li>
            <li><Link to="/browse?sort=new">Newest phones</Link></li>
            <li><Link to="/compare">Compare phones</Link></li>
          </ul>
        </nav>

        {brands.length > 0 && (
          <nav aria-label="Brands">
            <h2>Brands</h2>
            <ul>
              {brands.slice(0, MAX_BRANDS).map((brand) => (
                <li key={brand.id}><Link to={browseUrl({ brands: [brand.id] })}>{brand.name}</Link></li>
              ))}
            </ul>
          </nav>
        )}

      </div>

      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} MobileLens</span>
        <ThemeSwitch />
        <button type="button" className="ui-btn ui-btn-small" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Icon name="arrowUp" /> Back to top
        </button>
      </div>
    </footer>
  );
}

export default Footer;
