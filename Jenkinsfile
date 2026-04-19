pipeline {
    agent any

    environment {
        // SonarQube connects via the shared devops network — use SERVICE name not container_name
        SONAR_HOST_URL = 'http://sonarqube:9000'
        // Bind the SonarQube token safely from Jenkins Credentials
        SONAR_TOKEN = credentials('sonar-token')
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Pulling latest code from main branch..."
                // Simplified checkout mapping to the underlying repo
                checkout scmGit(branches: [[name: '*/main']], extensions: [], userRemoteConfigs: [[url: 'https://github.com/Heetk15/DoomScroll.git', credentialsId: 'github-token']])
            }
        }

        stage('Code Quality (SonarQube)') {
            steps {
                echo "Running SonarScanner via CLI container..."
                // Running the scanner through Docker CLI to avoid managing Java/Node versions inside Jenkins natively
                sh '''
                docker run --rm \
                    -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
                    -v "${WORKSPACE}:/usr/src" \
                    --network doomscroll_devops_net \
                    sonarsource/sonar-scanner-cli:4.8 \
                    -Dsonar.projectKey=DoomScroll \
                    -Dsonar.sources=. \
                    -Dsonar.login="${SONAR_TOKEN}" \
                    -Dsonar.exclusions=**/node_modules/**,**/__pycache__/**,**/.next/**
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo "Building application images..."
                sh 'docker-compose build'
            }
        }

        stage('Deploy (Ansible)') {
            steps {
                echo "Executing Ansible Playbook..."
                // Since this is a simple local deployment context, trigger the deploy.yml playbook
                sh 'ansible-playbook deploy.yml -i "localhost," -c local'
            }
        }
    }
}
