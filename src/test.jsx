<div className='my-6'>
<div className='flex gap-2 items-center'>
  <img src={response.image.small} alt={response.name} />
  <h1 className='text-2xl mb-2 capitalize font-bold'>{response.id}</h1>
    
  <Button color='green' > Bulls : {response.sentiment_votes_up_percentage} % </Button>
  <Button color='red' > Bears : {response.sentiment_votes_down_percentage} % </Button>
</div>
</div>