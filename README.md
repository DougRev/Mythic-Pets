# Mythic Pets

## Unleash Your Pet's Inner Legend

Mythic Pets is a web application that transforms your pet into a legendary hero with AI-generated personas, artwork, and epic stories. What legend will your pet become?

This project was built using **Firebase Studio**.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **AI/Generative**: [Google's Gemini](https://ai.google.dev/) via [Genkit](https://firebase.google.com/docs/genkit)
- **Backend & Auth**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Deployment**: [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v20 or later recommended)
- npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DougRev/Mythic-Pets.git
    cd Mythic-Pets
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add your Firebase and Stripe configuration details. You can usually get your Firebase config from the Firebase console.

    ```
    # Firebase Environment Variables
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    # ... and so on for all firebase config values.

    # Stripe Environment Variables
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
    STRIPE_SECRET_KEY=your_stripe_secret_key
    STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
    STRIPE_PRO_PRICE_ID=your_stripe_price_id
    ```

### Running the Development Server

To run the app in development mode, which includes the Next.js frontend and the Genkit flows, use the following commands.

1.  **Start the Genkit development server:**
    This runs your AI flows and makes them available for your app.
    ```bash
    npm run genkit:watch
    ```

2.  **In a separate terminal, start the Next.js development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Project Structure

- `src/app/`: Main application routes (App Router).
- `src/components/`: Reusable React components, including UI from ShadCN.
- `src/ai/`: Contains all Genkit-related code, including AI flows and prompts.
- `src/firebase/`: Firebase configuration and custom hooks (`useAuth`, `useDoc`, etc.).
- `src/lib/`: Utility functions, data models, and third-party client initializations (Stripe).
- `public/`: Static assets like images and fonts.
