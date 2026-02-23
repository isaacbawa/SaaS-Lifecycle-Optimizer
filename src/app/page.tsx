import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}

# Initialize a new Git repository in your project directory
git init -b main

# Add all the files to the staging area
git add .

# Create your first commit
git commit -m "Initial commit"

# Add your new GitHub repository as the remote origin
git remote add origin https://github.com/isaacbawa/saas_email_system.git

# Push your code to the main branch on GitHub
git push -u origin main