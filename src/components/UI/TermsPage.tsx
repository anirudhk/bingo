import { Link } from 'react-router-dom';
import { LegalArticle } from './LegalArticle';
import { LEGAL_CONTACT, TERMS_UPDATED } from '../../constants/legal';

/** Terms of Service. Have them reviewed before promoting the app. */
export const TermsPage: React.FC = () => (
  <LegalArticle title="Terms of Service" updated={TERMS_UPDATED}>
    <p>
      Grid Genius is a free maths puzzle game. By using it you agree to these terms. See also the{' '}
      <Link to="/privacy" className="underline">
        Privacy Policy
      </Link>
      .
    </p>

    <h2>Accounts</h2>
    <ul>
      <li>You must be 13 or older to create an account. Anyone can play without one.</li>
      <li>One account per person. Keep your sign-in email or Google/Apple account secure.</li>
      <li>
        Handles and display names must not be offensive or pretend to be someone else. We may change
        or remove ones that are.
      </li>
    </ul>

    <h2>Fair play</h2>
    <p>
      Leaderboards and ratings only mean something if everyone plays honestly. Do not use bots,
      scripts or solvers, play from more than one account, share answers to the daily puzzle before
      the day ends, or exploit bugs. We may remove results, reset ratings, or suspend accounts that
      break these rules.
    </p>

    <h2>The service</h2>
    <p>
      The game is provided free and as is, without warranties of any kind. Features, puzzles,
      ratings and leaderboards may change, be reset or be discontinued. To the extent the law
      allows, we are not liable for losses arising from using the game, including lost progress.
    </p>

    <h2>Ending your use</h2>
    <p>
      You can stop using the game or delete your account at any time from Settings. We may close
      accounts that break these terms.
    </p>

    <h2>Changes and contact</h2>
    <p>
      If these terms change, the date at the top will change too. Questions:{' '}
      <a href={LEGAL_CONTACT.href} className="underline" target="_blank" rel="noreferrer">
        {LEGAL_CONTACT.label}
      </a>
      .
    </p>
  </LegalArticle>
);
