# PORTIQ — Smart Port Yard Optimizer

**"See the yard. Predict the move. Optimize the retrieval."**

**[View the Live Interactive Prototype](https://swore-repay-56922163.figma.site/)**  
**[Watch the Project Demonstration Video](https://drive.google.com/file/d/1ZZAJ3yORdE5Srjf6O5Pe7vmHdNosceEN/view?usp=sharing)**

PORTIQ is a high-fidelity enterprise web application designed to support modern container terminal operations. It provides port operations managers with an interactive control center for 3D container yard visualization, container management, crane coordination, and retrieval optimization.

## About the Project
Container yards manage thousands of stacked containers, making it difficult to locate specific units and determine the most efficient retrieval sequence. Traditional operational interfaces rely on static tables, which increases cognitive load for operators. 

PORTIQ solves this by combining a spatial 3D/isometric yard visualization with operational analytics. The system allows an operations manager to search for a container, locate it within the yard, identify blocking containers, and generate an optimized retrieval plan.

## Key Features
* **Interactive 3D Yard Visualization:** A digital twin of the container yard showing blocks, bays, rows, and stacking levels.
* **Smart Search & Locate:** Instantly locate target containers (e.g., CNU-48291) and view contextual details like weight, destination, and priority.
* **Blockage Detection:** Automatically identify containers stacked on top of the target that require temporary movement.
* **Retrieval Optimization:** Compare current standard plans vs. optimized plans (e.g., reducing retrieval time from 8m 42s to 6m 24s).
* **Crane Coordination:** Preview proposed movement routes for assigned RTG cranes.
* **Operational Analytics:** Monitor real-time KPIs including Yard Utilization, Active Cranes, and Optimization Scores.

## How to View the Demo
This prototype includes a seamless demonstration login system for easy academic and evaluation access.

**Option 1: Instant Access**
1. On the login screen, click the ENTER DEMO MODE — NO LOGIN REQUIRED button.
2. You will instantly bypass authentication and enter the main dashboard.

**Option 2: Demo Credentials**
1. Use the provided demo auto-fill button.
2. User ID: user1
3. Password: 12345
4. Click SIGN IN.

## Built With
* HTML5
* CSS3 (Modern Grid/Flexbox)
* Vanilla JavaScript
* TypeScript & Vite (Build Tools)

## Running the Project Locally
To run this project on your local machine:
1. Clone the repository: git clone https://github.com/ananyatabassum/PORTIQ.git
2. Open the directory in your terminal.
3. Install dependencies: npm install
4. Start the development server: npm run dev

Submitted for UI/UX Design (CSE441)
