# Choir Seating Manager

A web application for managing and displaying choir standing orders, built with React, TypeScript, and SCSS, deployable to AWS CloudFront using AWS CDK.

## 🎯 Features

- **Member Management**: Add, remove, and organize choir members by voice section (Soprano, Alto, Tenor, Bass)
- **Standing Order Display**: Visual display of choir arrangement by section
- **Position Control**: Move members up/down within their sections
- **Data Persistence**: localStorage for client-side data storage
- **Import/Export**: JSON-based backup and restore functionality
- **Responsive Design**: Mobile and desktop-friendly interface
- **AWS Deployment**: CloudFront CDN distribution with S3 hosting

## 🏗️ Project Structure

This is a Yarn workspaces monorepo with two packages:

```
choir-seating-manager/
├── packages/
│   ├── website/              # React + TypeScript + SCSS frontend
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── styles/       # SCSS stylesheets
│   │   │   ├── types/        # TypeScript type definitions
│   │   │   ├── utils/        # Utility functions
│   │   │   ├── App.tsx       # Main app component
│   │   │   └── main.tsx      # Entry point
│   │   ├── public/           # Static assets
│   │   ├── index.html        # HTML template
│   │   └── vite.config.ts    # Vite configuration
│   └── infrastructure/       # AWS CDK infrastructure
│       ├── lib/
│       │   └── website-stack.ts  # CloudFront + S3 stack
│       ├── bin/
│       │   └── infrastructure.ts # CDK app entry point
│       └── cdk.json          # CDK configuration
├── package.json              # Root workspace config
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn package manager
- AWS CLI configured (for deployment)
- AWS CDK CLI (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd choir-seating-manager
```

2. Install dependencies:
```bash
yarn install
```

This will install dependencies for all packages in the monorepo.

## 💻 Development

### Running the Website Locally

```bash
# Start development server
yarn dev

# The app will be available at http://localhost:5173
```

### Building the Website

```bash
# Build for production
yarn build

# Preview production build
yarn preview
```

## ☁️ AWS Deployment

### Prerequisites

1. Configure AWS credentials:
```bash
aws configure
```

2. Bootstrap CDK (first time only):
```bash
cd packages/infrastructure
npx cdk bootstrap
```

### Deploy to AWS

```bash
# From project root - builds website and deploys infrastructure
yarn deploy
```

This command will:
1. Build the React website
2. Deploy the CDK stack (S3 bucket + CloudFront distribution)
3. Upload the built website to S3
4. Invalidate CloudFront cache

After deployment, the CloudFront URL will be displayed in the terminal output.

### CDK Commands

```bash
# From project root
yarn cdk synth    # Synthesize CloudFormation template
yarn cdk diff     # Show changes to be deployed
yarn cdk deploy   # Deploy the stack
```

## 🎨 Architecture

### Frontend Stack
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Fast build tool
- **SCSS**: Styling with variables and nesting
- **localStorage**: Client-side data persistence

### AWS Infrastructure
- **S3**: Static website hosting
- **CloudFront**: Global CDN for fast content delivery
- **Origin Access Identity**: Secure S3 access
- **AWS CDK**: Infrastructure as Code in TypeScript

## 📝 Usage

### Adding Choir Members

1. Enter member name
2. Select voice section (Soprano, Alto, Tenor, Bass)
3. Click "Add Member"

### Managing Standing Order

- **Move Up/Down**: Use arrow buttons to adjust position within section
- **Remove**: Click × to remove a member
- **Export Data**: Save current configuration as JSON file
- **Import Data**: Load previously saved configuration

### Data Format

The application uses a simple JSON format for data import/export:

```json
{
  "members": [
    {
      "id": "unique-id",
      "name": "Member Name",
      "voiceSection": "Soprano",
      "position": 0
    }
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Configuration

### Customizing Colors

Edit `packages/website/src/styles/variables.scss` to customize:
- Voice section colors
- Primary/secondary colors
- Spacing and layout

### CDK Stack Customization

Edit `packages/infrastructure/lib/website-stack.ts` to:
- Change S3 bucket name
- Add custom domain with Route53
- Configure CloudFront cache policies
- Add SSL certificates

## 🧪 Testing

### Test Session

For testing purposes, use the session code: **`demo-choir-2024`**

This test session contains sample choir data with 60 members and can be accessed at:
```
http://localhost:5174/demo-choir-2024
```

### Mobile Testing

The application now supports mobile touch interactions:
- **Single-finger pan**: Drag with one finger to pan around the stage
- **Pinch-to-zoom**: Use two fingers to zoom in/out
- **Member dragging**: Touch and drag choir members to reposition them
- **Zoom controls**: Use the on-screen buttons for precise zoom control

## 🧪 Future Enhancements

Potential features for future development:

- **Authentication**: AWS Cognito integration for user management
- **Backend API**: Lambda + API Gateway for server-side data storage
- **Database**: DynamoDB or RDS for persistent storage
- **Real-time Updates**: WebSocket support for collaborative editing
- **Advanced Ordering**: Drag-and-drop reordering
- **Print Layout**: Optimized view for printing standing orders
- **Multiple Choirs**: Support for managing multiple choir groups

## 📄 License

This project is private and not licensed for public use.

## 🤝 Contributing

This is a private project. Contributions are managed internally.

## 📧 Support

For issues or questions, please contact the project maintainer.
