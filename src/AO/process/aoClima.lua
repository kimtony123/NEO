local json = require("json")
local math = require("math")

_0RBIT = "BaMK1dfayo75s3q1ow6AO64UDpD9SEFbeE8xYrY2fyQ"
_0RBT_TOKEN = "BUhZLMwQ6yZHguLtJYA5lLUa9LQzLXMXRfaq9FVcPJc"

local BASE_URL = "https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=a2f4db644e9107746535b0d2ca43b85d&units=metric"

FEE_AMOUNT = "1000000000000" -- 1 $0RBT

balances = balances or {}

ArchivedTrades = ArchivedTrades or {}
WinnersList = WinnersList or {}
-- Credentials token
NOT = "6XvODi4DHKQh1ebBugfyVIXuaHUE5SKEaK1-JbhkMfs"
USDA = "GcFxqTQnKHcr304qnOcq00ZqbaYGDn4Wbb0DHAM-wvU";

-- Table to track addresses that have requested tokens
RequestedAddresses = RequestedAddresses or {}

openTrades = openTrades or {}
expiredTrades = expiredTrades or {}
closedTrades = closedTrades or {}
winners = winners or {}
Profits = Profits or {}

-- Callback function for fetch price
fetchPriceCallback = nil

-- Table to store weather data
WEATHER_DATA = WEATHER_DATA or  {}


function fetchPrice(callback, City)
    local city = City
    local url = string.format("https://api.openweathermap.org/data/2.5/weather?q=%s&appid=a2f4db644e9107746535b0d2ca43b85d&units=metric", city)

    -- Print the URL to verify it before sending
    print("Generated URL:", url)

    Send({
        Target = _0RBT_TOKEN,
        Action = "Transfer",
        Recipient = _0RBIT,
        Quantity = FEE_AMOUNT,
        ["X-Url"] = url,
        ["X-Action"] = "Get-Real-Data"
    })

    print("GET Request sent to the 0rbit process.")

    -- Save the callback to be called later
    fetchPriceCallback = callback
end

-- Store the received weather data
function receiveData(msg)
    if msg.Action == "Receive-Response" then
        -- Decode the incoming JSON data
        local res, pos, err = json.decode(msg.Data)

        -- Check if JSON decoding was successful
        if not res then
            print("Error decoding JSON:", err)
            return
        end

        -- Print the entire decoded data for verification
        print("Received data:")
        print(res)

        -- Ensure that the received data has the necessary fields
        if res.name and res.main and res.main.temp then
            -- Store the weather data in the WEATHER_DATA table using city name as the key
            WEATHER_DATA[res.name] = {
                id = res.id,
                name = res.name,
                currentTemp = res.main.temp
            }

            -- Print the stored data for verification
            print("Stored data in WEATHER_DATA for city:", res.name)
            print("ID: " .. WEATHER_DATA[res.name].id)
            print("Current Temperature: " .. WEATHER_DATA[res.name].currentTemp)
        else
            print("Error: Missing necessary data in the response.")
        end

        -- Call the callback if it exists
        if fetchPriceCallback then
            fetchPriceCallback()
            fetchPriceCallback = nil -- Clear the callback after calling
        end
    else
        print("Error: Unrecognized action in message.")
    end
end

-- Retrieve the price from WEATHER_DATA
function getTokenPrice(token)
    local token_data = WEATHER_DATA[token]

    if not token_data or not token_data.currentTemp then
        print("Error: No data found for token", token)
        return nil
    else
        print("Returning currentTemp for token", token, ":", token_data.currentTemp)
        return token_data.currentTemp
    end
end

function processExpiredContracts(m)
    currentTime = getCurrentTime(m)
    print("Starting to process expired contracts at time:", currentTime)

    -- Check if the expiredTrades list is empty and exit early if it is
    if next(expiredTrades) == nil then
        print("No expired trades to process.")
        return
    end

    -- Define the callback to process expired trades after fetching prices
    local function processTrades()
        for tradeId, trade in pairs(expiredTrades) do
            print("Processing tradeId:", tradeId)
            print("Trade Details: ", trade)

            -- Fetch the current temperature for the city associated with the trade
            fetchPrice(function()
                local closingTemp = getTokenPrice(trade.City)
                if closingTemp then
                    trade.ClosingTemp = closingTemp
                    trade.ClosingTime = currentTime
                    print("Updated trade:", tradeId, "with ClosingTemp:", closingTemp, "and ClosingTime:", currentTime)
                    
                    -- Check if the trade is a winner
                    if checkTradeWinner(trade, closingTemp) then
                        winners[tradeId] = trade
                        print("Trade is a winner:", tradeId)
                    else
                        trade.Outcome = "lost"
                        closedTrades[tradeId] = trade
                        print("Trade lost:", tradeId)
                    end
                    
                    -- Remove the trade from expiredTrades after processing
                    expiredTrades[tradeId] = nil
                else
                    print("Error: No closing temperature found for trade:", tradeId, "with City:", trade.City)
                end
            end, trade.City)

            -- Check if ClosingTemp was not set, indicating an issue
            if not trade.ClosingTemp then
                print("Skipping tradeId:", tradeId, "due to nil ClosingTemp.")
            end
        end
    end

    -- Call the processTrades function to begin processing
    processTrades()

    -- Confirm that sendRewards function is called
    print("Calling sendRewards function")
    sendRewards()

    -- Print final state of expiredTrades to ensure trades are removed after processing
    print("Final state of expiredTrades:")
    for tradeId, trade in pairs(expiredTrades) do
        print("TradeId: " .. tradeId .. ", Trade: " .. tostring(trade))
    end
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


-- Function to check if the trade is a winner
function checkTradeWinner(trade, closingTemp)
    local winner = false
    if trade.ContractType == "Call" and closingTemp > tonumber(trade.AssetPrice) then
        winner = true
    elseif trade.ContractType == "Put" and closingTemp < tonumber(trade.AssetPrice) then
        winner = true
    end
    return winner
end

function sendRewards()
    -- Print initial state of winners
    print("Initial state of winners:")
    for _, winner in pairs(winners) do
        print("Winner UserId: " .. winner.UserId .. ", TradeId: " .. winner.TradeId .. ", Payout: " .. tostring(winner.Payout) .. ", BetAmount: " .. tostring(winner.BetAmount))
    end

    -- Check if there are any winners or expired trades to process
    if not winners or #winners == 0 then
        print("No winners to process.")
        return
    end

    -- Process rewards for winners
    for tradeId, winner in pairs(winners) do
        if winner.Payout then
            local payout = winner.Payout * winner.BetAmount
            ao.send({
                Target = USDA,
                Action = "Transfer",
                Quantity = tostring(payout),
                Recipient = tostring(winner.UserId)
            })

            -- Ensure balances[winner.UserId] is initialized to 0 if it's nil
            balances[winner.UserId] = (balances[winner.UserId] or 0) + payout
            print("Transferred: " .. payout .. " successfully to " .. winner.UserId)

            -- Update the trade outcome to "won"
            winner.Outcome = "won"
            closedTrades[tradeId] = winner
            print("TradeId " .. tradeId .. " marked as won and moved to closedTrades.")
        else
            print("Skipping reward for winner with nil Payout.")
        end
    end

    -- Print final state of closedTrades
    print("Final state of closedTrades:")
    for tradeId, trade in pairs(closedTrades) do
        print("TradeId: " .. tradeId .. ", Outcome: " .. tostring(trade.Outcome))
    end

    -- Clear winners table after sending rewards
    winners = {}
    print("Cleared winners table.")
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


function ClearClosedTrades(userId)
    -- Table to store trades that the user can clear
    local userTrades = {}

    for tradeId, trade in pairs(closedTrades) do
        if trade.UserId == userId then
            userTrades[tradeId] = trade
            ArchivedTrades[tradeId] = trade
        end
    end

    -- Remove cleared trades from closedTrades
    for tradeId in pairs(userTrades) do
        closedTrades[tradeId] = nil
    end

    print("Archived closed trades for user: " .. tostring(userId))
end

-- Function to get the current time in milliseconds
function getCurrentTime(msg)
    return msg.Timestamp -- returns time in milliseconds
end

Handlers.add(
    "GetTokenPrice",
    Handlers.utils.hasMatchingTag("Action", "Get-Token-Price"),
    function(m)
        local token = m.Tags.Token
        local current_price = getTokenPrice(token)

        if not current_price then
            Handlers.utils.reply("Price not available!!!")(m)
        else
            Handlers.utils.reply("Current Price: " .. tostring(current_price))(m)
        end
    end
)

Handlers.add(
    "FetchPrice",
    Handlers.utils.hasMatchingTag("Action", "Fetch-Price"),
    function(m)
        fetchPrice(m)
    end
)


Handlers.add(
    "trade",
    Handlers.utils.hasMatchingTag("Action", "trade"),
    function(m)
        currentTime = getCurrentTime(m)

        if m.Tags.TradeId and m.Tags.CreatedTime and m.Tags.Country and m.Tags.CountryId and m.Tags.City and m.Tags.CurrentTemp and m.Tags.ContractType
            and m.Tags.ContractStatus and m.Tags.BetAmount then
            -- Convert BetAmount and ContractExpiry to numbers
            local qty = tonumber(m.Tags.BetAmount)

            -- Check if qty or contractExpiry is nil and handle the error
            if qty == nil then
                print("Error: BetAmount is not a valid number.")
                ao.send({ Target = m.From, Data = "Invalid BetAmount. It must be a number." })
                return
            end
            -- Validate qty is a number
            assert(type(qty) == 'number', 'Quantity Tag must be a number')

            -- Check if qty is positive
            if qty <= 0 then
                print("Error: BetAmount must be a positive number.")
                ao.send({ Target = m.From, Data = "Invalid BetAmount. It must be a positive number." })
                return
            end

            -- Check if qty is within the allowed range
            if qty > 500000000000 and qty < 20000000000000 then
                local outcome = tostring("pending")
                openTrades[m.Tags.TradeId] = {
                    UserId = m.From,
                    TradeId = m.Tags.TradeId,
                    Country = m.Tags.Country,
                    City = m.Tags.City,
                    CountryId = m.Tags.CountryId,
                    CurrentTemp = m.Tags.CurrentTemp,
                    ContractType = m.Tags.ContractType,
                    ContractStatus = m.Tags.ContractStatus,
                    CreatedTime = currentTime,
                    ContractExpiry = currentTime + ( 86400  * 1000), -- Convert minutes to milliseconds
                    BetAmount = qty,
                    Payout = m.Tags.Payout,
                    Outcome = outcome -- Initialize outcome as nil
                }

                print("Trades table after update: " .. tableToJson(openTrades))
                ao.send({ Target = m.From, Data = "Successfully Created Trade" })
            else
                -- Print error message for invalid quantity
                print("Invalid quantity: " .. qty .. ". Must be more than 1 and less than 200000.")
                ao.send({ Target = m.From, Data = "Invalid quantity. Must be more than 1 and less than 200000." })
            end
        else
            -- Print error message for missing tags
            print("Missing required tags for trade creation.")
            ao.send({ Target = m.From, Data = "Missing required tags for trade creation." })
        end
    end,
    print("Trade Created Succesfully")
)

Handlers.add(
    "openTrades",
    Handlers.utils.hasMatchingTag("Action", "openTrades"),
    function(m)
        if not openTrades or next(openTrades) == nil then
            print("openTrades table is empty or nil.")
            ao.send({ Target = m.From, Data = "{}" }) -- Send an empty JSON if there are no trades
            return
        end

        local filteredTrades = {}
        for tradeId, trade in pairs(openTrades) do
            if trade.UserId == m.From then
                filteredTrades[tradeId] = trade
            end
        end
        ao.send({ Target = m.From, Data = tableToJson(filteredTrades) })
    end
)

Handlers.add(
    "closedTrades",
    Handlers.utils.hasMatchingTag("Action", "closedTrades"),
    function(m)
        -- Check if closedTrades is nil or empty
        if not closedTrades or next(closedTrades) == nil then
            print("closedTrades table is empty or nil.")
            ao.send({ Target = m.From, Data = "{}" }) -- Send an empty JSON if there are no trades
            return
        end

        -- Print the entire closedTrades table as a string for debugging
        print("Debugging closedTrades table:")
        print(closedTrades, {comment = false})

        -- Create a new table to store valid trades
        local validTrades = {}
        for tradeId, trade in pairs(closedTrades) do
            if trade.UserId == m.From then
                local status, result = pcall(function() return tableToJson(trade) end)
                if status then
                    validTrades[tradeId] = trade
                    print("Successfully converted tradeId: " .. tostring(tradeId) .. " to JSON.")
                else
                    print("Error converting tradeId: " .. tostring(tradeId) .. " to JSON. Skipping this trade.")
                end
            end
        end

        -- Convert validTrades to JSON and send it
        local jsonData = tableToJson(validTrades)
        ao.send({ Target = m.From, Data = jsonData })
    end
)



Handlers.add(
    "FetchPrice",
    Handlers.utils.hasMatchingTag("Action", "Fetch-Price"),
    function(m)
        fetchPrice(m)
    end
)

Handlers.add(
  "CronTick", -- handler name
  Handlers.utils.hasMatchingTag("Action", "Cron"), -- handler pattern to identify cron message
    checkExpiredContracts,
    function(m)
        processExpiredContracts(m)
    end
)

Handlers.add(
    "completeTrade",
    Handlers.utils.hasMatchingTag("Action", "completeTrade"),
    function(m)
        processExpiredContracts(m)
    end
)


Handlers.add(
    "ClearExpiredTrades",
    Handlers.utils.hasMatchingTag("Action", "ClearExpiredTrades"),
    function(m)
        expiredTrades = {}
        print("expiredTrades  have been cleared.")
    end
)
