local json = require("json")
local math = require("math")

-- Data storage
users = users or {}
balances = balances or {}
openTrades = openTrades or {}
archivedTrades = archivedTrades or {}

-- Data storage for transactions
transactions = transactions or {}
-- Initialize transaction ID counter
transactionCounter = transactionCounter or 0

-- List to store closed checked trades
currentRunningTrades = currentRunningTrades or {}

-- Credentials token
NEO = "wPmY5MO0DPWpgUGGj8LD7ZmuPmWdYZ2NnELeXdGgctQ"
USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";


-- Function to deposit funds
function deposit(user, amount)
    balances[user] = (balances[user] or 0) + amount
    print(user .. " deposited " .. amount .. ". New balance: " .. balances[user])
end


-- Function to withdraw funds
function withdraw(user, amount)
    -- Check if the user has a balance and if it is sufficient
    if balances[user] and balances[user] > 0 then
        if balances[user] >= amount then
            -- Deduct the amount from the user's balance
            balances[user] = balances[user] - amount
            print(user .. " withdrew " .. amount .. ". New balance: " .. balances[user])

            -- Send confirmation message to the user
            ao.send({
                Target = user,
                Data = "Successfully Withdrawn. New balance: " .. balances[user] / 1000000000000
            })

            return true -- Withdrawal successful
        else
            print("Insufficient balance for " .. user)
            ao.send({
                Target = user,
                Data = "Insufficient balance. Current balance: " .. balances[user] / 1000000000000
            })
            return false -- Withdrawal failed due to insufficient funds
        end
    else
        -- Handle the case where the user has no balance or a balance of 0
        print("Insufficient balance for " .. user)
        ao.send({
            Target = user,
            Data = "Insufficient balance. Current balance: 0"
        })
        return false -- Withdrawal failed due to 0 balance
    end
end


-- Function to find the most successful trader
function findMostSuccessfulTrader()
    local wins = {}
    
    for _, trade in pairs(archivedTrades) do
        if trade.Outcome == "won" then
            wins[trade.UserId] = (wins[trade.UserId] or 0) + 1
        end
    end

    local maxWins = 0
    local mostSuccessfulTrader = nil
    
    for user, winCount in pairs(wins) do
        if winCount > maxWins then
            maxWins = winCount
            mostSuccessfulTrader = user
        end
    end
    
    return mostSuccessfulTrader
end

function tableToJson(tbl)
    local result = {}
    for key, value in pairs(tbl) do
        local valueType = type(value)
        if valueType == "table" then
            value = tableToJson(value)
            table.insert(result, string.format('"%s":%s', key, value))
        elseif valueType == "string" then
            table.insert(result, string.format('"%s":"%s"', key, value))
        elseif valueType == "number" then
            table.insert(result, string.format('"%s":%d', key, value))
        elseif valueType == "function" then
            table.insert(result, string.format('"%s":"%s"', key, tostring(value)))
        end
    end

    local json = "{" .. table.concat(result, ",") .. "}"
    return json
end


-- Function to get the current time in milliseconds
function getCurrentTime(msg)
    return msg.Timestamp  -- returns time in milliseconds
end

-- Check Expired Contracts Handler Function
function checkExpiredContracts(msg)
    currentTime = tonumber(msg.Timestamp)
    print(currentTime)
    for tradeId, trade in pairs(openTrades) do
        local contractExp = tonumber(trade.ContractExpiry)
        if currentTime >= contractExp then
            trade.ContractStatus = "Expired"
            expiredTrades[tradeId] = trade
            openTrades[tradeId] = nil
        end
    end
end

-- Function to generate a unique transaction ID
function generateTransactionId()
    transactionCounter = transactionCounter + 1
    return "TX" .. tostring(transactionCounter)
end


-- Function to fetch openTrades from another process
function fetchOpenTrades()
    -- Send a request to the target process to get the openTrades
    ao.send({
        Target = NEO, -- Replace with the actual target process name or identifier
        Action = "getOpenTrades"
    })
end

-- Function to fetch archivedTrades from another process
function fetchArchivedTrades()
    -- Send a request to the target process to get the openTrades
    ao.send({
        Target = NEO, -- Replace with the actual target process name or identifier
        Action = "getArchivedTrades"
    })
end

-- Handler to process the response with openTrades data
Handlers.add(
    "openTradesResponse",
    Handlers.utils.hasMatchingTag("Action", "openTradesResponse"),
    function(m)
        local openTradesData = json.decode(m.Data)
        print("Received openTrades data:", json.encode(openTradesData))
        
        -- Save the openTrades data into closedCheckedTrades list
        for _, trade in pairs(openTradesData) do
            table.insert(currentRunningTrades, trade)
        end
        print("Updated currentRunningTrades:", json.encode(currentRunningTrades))
    end
)

-- Handler to process the response with openTrades data
Handlers.add(
    "archivedTradesResponse",
    Handlers.utils.hasMatchingTag("Action", "archivedTradesResponse"),
    function(m)
        local archivedTradesData = json.decode(m.Data)
        print("Received openTrades data:", json.encode(archivedTradesData))
        
        -- Save the openTrades data into closedCheckedTrades list
        for _, trade in pairs(archivedTradesData) do
            table.insert(archivedTrades, trade)
        end
        print("Updated archivedTrades:", json.encode(archivedTrades))
    end
)

Handlers.add(
     "fetchOpenTrades",
    Handlers.utils.hasMatchingTag("Action", "fetchOpenTrades"),
    fetchOpenTrades

)


Handlers.add(
     "fetchArchivedTrades",
    Handlers.utils.hasMatchingTag("Action", "fetchArchivedTrades"),
    fetchArchivedTrades
)


-- Handler for deposit
Handlers.add(
    "deposit",
    Handlers.utils.hasMatchingTag("Action", "deposit"),
    function(m)
        if m.Tags.Amount then
            local user = m.From
            local amount = tonumber(m.Tags.Amount)   
            if amount <= 0 then
            print("Deposit amount must be positive.")
            return
            end
            print("amount:"..amount)
        deposit(user, amount)
            ao.send({ Target = m.From, Data = "Sucessfully Deposited. New balance" .. balances[user] / 1000000000000 })
            
            currentTime = getCurrentTime(m)
            local transactionId = generateTransactionId()
            -- Record the transaction
            table.insert(transactions, {
            user = user,
            transactionid = transactionId,
            type = "deposit",
            amount = amount,
            balance = balances[user],
            timestamp = currentTime
            })
        end 
    end
)

-- Handler for withdrawal
Handlers.add(
    "withdraw",
    Handlers.utils.hasMatchingTag("Action", "withdraw"),
    function(m)
        if m.Tags.Amount then
            local user = m.From
            local amount = tonumber(m.Tags.Amount)
            local success = withdraw(user, amount)
            
            if success then
                -- Only send transfer if withdrawal was successful
                ao.send({
                    Target = USDA,
                    Action = "Transfer",
                    Quantity = tostring(amount),
                    Recipient = tostring(m.From)
                })
                ao.send({ Target = m.From, Data = "Successfully Withdrawn. New balance: " .. balances[user] /
                        1000000000000
                })
                currentTime = getCurrentTime(m)
                local transactionId = generateTransactionId()
                -- Record the transaction
                table.insert(transactions, {
                    user = user,
                    transactionid = transactionId,
                    type = "withdrawal",
                    amount = amount,
                    balance = balances[user],
                    timestamp = currentTime})
            else
                ao.send({ Target = m.From, Data = "Withdrawal failed due to insufficient funds. Current balance: " .. balances[user]/1000000000000 })
            end
        end  
    end
)

Handlers.add('balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(m)
    local bal = '0'
    
    -- If not Target is provided, then return the Senders balance
    if (m.Tags.Target and balances[m.Tags.Target]) then
        bal = tostring(balances[m.Tags.Target])
    elseif balances[m.From] then
        bal = tostring(balances[m.From])
    end
    
    ao.send({
        Target = m.From,
        Tags = { Target = m.From, Balance = bal, Ticker = Ticker, Data = json.encode(tonumber(bal)) }
    })
    end)

-- Handler to view all transactions
Handlers.add(
    "view_transactions",
    Handlers.utils.hasMatchingTag("Action", "view_transactions"),
    function(m)
        local user = m.From
        local user_transactions = {}
        
        -- Filter transactions for the specific user
        for _, transaction in ipairs(transactions) do
            -- Skip nil transactions
            if transaction ~= nil and transaction.user == user then
                table.insert(user_transactions, transaction)
            end
        end
        -- Send the filtered transactions back to the user
        ao.send({ Target = user, Data = tableToJson(user_transactions) })
    end
)
