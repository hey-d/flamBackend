# **QueueCTL**


* QueueCTL is a command-line tool I built in Node.js that works like a small background job queue system.
* It lets you add commands as jobs, run them using worker processes, handle retries automatically, and move failed jobs to a Dead Letter Queue (DLQ).
* All jobs are stored locally so they don’t disappear even if you stop and restart the program.




#### **Features:**


* Add jobs to a queue through the CLI
* Run multiple workers at once
* Automatic retry with exponential backoff
* Moves permanently failed jobs to a DLQ
* Persistent job storage using JSON files
* Simple configuration management
* Works completely from the terminal




#### **Setup:**


1. Clone the repo and open it in your terminal:
    
    
    git clone https://github.com/hey-d/flamBackend
    
    cd flamBackend

2. Install dependencies:
    
    
    npm install

3. Link it globally:
    
    
    npm link





#### **Usage:**


1. Add a New Job:   

    queuectl enqueue "{\\"command\\":\\"echo Hello World\\"}"

2. See Pending Jobs: 

     queuectl list --state pending

3. Start Workers:   

    queuectl worker start --count 2

4. Check Overall Status:

    queuectl status

5. View Completed Or Failed Jobs: 

    queuectl list

6. Check Jobs that Failed Permanently:  

    queuectl dlq list

7. Retry a DLQ Job:   

    queuectl dlq retry <jobId>

8. Update Configuration:   

    queuectl config set maxRetries 5

    queuectl config set backoffBase 3

9. Stop Workers gracefully:
               
    queuectl worker stop





#### **Tesing the System:**


You can run the built-in test script that creates and processes 30 jobs:

	npm run test:perf





