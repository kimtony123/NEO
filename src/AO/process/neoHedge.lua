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
closedCheckedTrades = closedCheckedTrades or {}

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
    if balances[user] and balances[user] >= amount then
        balances[user] = balances[user] - amount
        print(user .. " withdrew " .. amount .. ". New balance: " .. balances[user])
        return true  -- Withdrawal successful
    else
        print("Insufficient balance for " .. user)
        return false  -- Withdrawal failed
    end
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



-- Function to generate a unique transaction ID
function generateTransactionId()
    transactionCounter = transactionCounter + 1
    return "TX" .. tostring(transactionCounter)
end

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
                    timestamp = currentTime
                })
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
            if transaction.user == user then
                table.insert(user_transactions, transaction)
            end
        end
        
        ao.send({ Target = user, Data = tableToJson(user_transactions) })
    end
)