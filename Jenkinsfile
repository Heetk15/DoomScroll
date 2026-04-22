pipeline {
    agent any

    parameters {
        choice(name: 'DEPLOY_MODE', choices: ['local', 'ssh'], description: 'Deployment mode: local Docker Compose in Jenkins workspace or SSH target deployment')
        string(name: 'LOCAL_COMPOSE_PROJECT', defaultValue: 'doomscroll', description: 'Compose project name used in local mode to avoid duplicate stacks from different workspace paths')
        string(name: 'DEPLOY_HOST', defaultValue: 'host.docker.internal', description: 'SSH reachable host where Docker Compose will run')
        string(name: 'DEPLOY_USER', defaultValue: 'deploy', description: 'SSH user on deployment host')
        string(name: 'DEPLOY_PATH', defaultValue: '/opt/DoomScroll', description: 'Absolute path on target host containing docker-compose.yml')
    }

    environment {
        // SonarQube connects via the shared devops network — use SERVICE name not container_name
        SONAR_HOST_URL = 'http://sonarqube:9000'
        // Bind the SonarQube token safely from Jenkins Credentials
        SONAR_TOKEN = credentials('sonar-token')
        // Explicitly pinned network name from docker-compose.devops.yml
        DEVOPS_NETWORK = 'doomscroll_devops_net'
        // Deployment values are runtime parameters to support local and remote targets.
        DEPLOY_HOST = "${params.DEPLOY_HOST}"
        DEPLOY_USER = "${params.DEPLOY_USER}"
        DEPLOY_PATH = "${params.DEPLOY_PATH}"
        LOCAL_COMPOSE_PROJECT = "${params.LOCAL_COMPOSE_PROJECT}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Pulling latest code from main branch..."
                // Simplified checkout mapping to the underlying repo
                checkout scmGit(branches: [[name: '*/main']], extensions: [], userRemoteConfigs: [[url: 'https://github.com/Heetk15/DoomScroll.git', credentialsId: 'github-token']])
            }
        }

        stage('Pre-flight Summary') {
            steps {
                echo "Deployment pre-flight check"
                sh '''
                echo "============================================="
                echo "DoomScroll Pipeline Pre-flight Summary"
                echo "Build Number : ${BUILD_NUMBER}"
                echo "Branch       : ${BRANCH_NAME:-main}"
                echo "Deploy Mode  : ${DEPLOY_MODE}"
                echo "Local Project: ${LOCAL_COMPOSE_PROJECT}"
                echo "Deploy Host  : ${DEPLOY_HOST}"
                echo "Deploy User  : ${DEPLOY_USER}"
                echo "Deploy Path  : ${DEPLOY_PATH}"
                echo "Workspace    : ${WORKSPACE}"
                echo "============================================="
                '''
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
                    --network "${DEVOPS_NETWORK}" \
                    sonarsource/sonar-scanner-cli:4.8 \
                    -Dsonar.projectKey=DoomScroll \
                    -Dsonar.sources=. \
                    -Dsonar.login="${SONAR_TOKEN}" \
                    -Dsonar.exclusions=**/node_modules/**,**/__pycache__/**,**/.next/**
                '''
            }
        }

        stage('Validate Toolchain') {
            steps {
                sh '''
                docker --version
                docker compose version
                ansible --version
                '''
            }
        }

        stage('Docker Build') {
            steps {
                echo "Building application images..."
                sh 'docker compose -p "${LOCAL_COMPOSE_PROJECT}" -f docker-compose.yml build'
            }
        }

        stage('Sync Workspace To Target') {
            when {
                expression { params.DEPLOY_MODE == 'ssh' }
            }
            steps {
                echo "Syncing checked out source code to target host path before deployment..."
                sshagent(credentials: ['deploy-host-ssh']) {
                    sh '''
                    set -e

                    ARCHIVE_NAME="doomscroll-workspace-${BUILD_NUMBER}.tgz"
                    ARCHIVE_LOCAL="/tmp/${ARCHIVE_NAME}"
                    ARCHIVE_REMOTE="/tmp/${ARCHIVE_NAME}"

                    tar \
                        --exclude='.git' \
                        --exclude='frontend/node_modules' \
                        --exclude='frontend/.next' \
                        --exclude='**/__pycache__' \
                        -czf "${ARCHIVE_LOCAL}" \
                        -C "${WORKSPACE}" .

                    ssh -o StrictHostKeyChecking=no "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p '${DEPLOY_PATH}'"
                    scp -o StrictHostKeyChecking=no "${ARCHIVE_LOCAL}" "${DEPLOY_USER}@${DEPLOY_HOST}:${ARCHIVE_REMOTE}"
                    ssh -o StrictHostKeyChecking=no "${DEPLOY_USER}@${DEPLOY_HOST}" "tar -xzf '${ARCHIVE_REMOTE}' -C '${DEPLOY_PATH}' && rm -f '${ARCHIVE_REMOTE}'"

                    rm -f "${ARCHIVE_LOCAL}"
                    '''
                }
            }
        }

        stage('Deploy (Local)') {
            when {
                expression { params.DEPLOY_MODE == 'local' }
            }
            steps {
                echo "DEPLOY_MODE=local. Deploying directly from Jenkins workspace via Docker socket..."
                sh '''
                test -f backend/.env || touch backend/.env
                docker compose -p "${LOCAL_COMPOSE_PROJECT}" -f docker-compose.yml up -d --build --remove-orphans
                '''
            }
        }

        stage('Deploy (SSH + Ansible)') {
            when {
                expression { params.DEPLOY_MODE == 'ssh' }
            }
            steps {
                echo "Executing Ansible Playbook..."
                // Execute deployment on the target host so compose paths resolve on that host filesystem.
                sshagent(credentials: ['deploy-host-ssh']) {
                    sh '''
                    ansible-playbook deploy.yml \
                        -i "${DEPLOY_HOST}," \
                        -u "${DEPLOY_USER}" \
                        --ssh-common-args='-o StrictHostKeyChecking=no' \
                        --extra-vars "deploy_path=${DEPLOY_PATH}"
                    '''
                }
            }
        }
    }
}
